// Supabase Edge Function: payment-webhook
// Secure handling of payment callbacks (PIX, Boleto, Credit Card).
// The provider must sign the raw body: header x-webhook-signature = hex HMAC-SHA256(body, PAYMENT_WEBHOOK_SECRET).
// On a confirmed payment the invoice is marked paid and, if the contract has no other invoice
// late beyond its tolerance, licenses suspended for delinquency are reactivated.
// Licenses suspended manually by staff are never reactivated here.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, handleError, json, verifyWebhookSignature } from "../_shared/security.ts";
import { daysOverdue, DEFAULT_ACCESS_POLICY } from "../_shared/access-policy.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Signature is computed over the exact bytes received, so read the raw body first
    const rawBody = await req.text();
    await verifyWebhookSignature(rawBody, req.headers.get("x-webhook-signature"));

    const { event, invoice_id, amount_paid, payment_method, paid_at } = JSON.parse(rawBody);
    if (!invoice_id || event !== "payment.confirmed") {
      return json({ error: "Invalid event or missing invoice_id" }, 400);
    }

    const supabaseAdmin = adminClient();

    // 1. Fetch invoice and its contract
    const { data: invoice, error: invError } = await supabaseAdmin
      .from("invoices")
      .select("id, status, contract_id, contracts(id, status, block_after_days)")
      .eq("id", invoice_id)
      .single();

    if (invError || !invoice) {
      return json({ error: "Invoice not found" }, 404);
    }

    // Providers retry callbacks: a second delivery must not redo anything
    if (invoice.status === "paid") {
      return json({ success: true, message: "Invoice already reconciled", invoice_id });
    }

    // 2. Mark invoice as paid
    await supabaseAdmin
      .from("invoices")
      .update({
        status: "paid",
        paid_at: paid_at || new Date().toISOString(),
        reconciled_by_edge_function: true,
      })
      .eq("id", invoice_id);

    // 3. Reactivate licenses only if nothing else on the contract is still beyond the tolerance
    const now = new Date();
    // deno-lint-ignore no-explicit-any
    const contract = (invoice as any).contracts;
    const blockAfter = contract?.block_after_days ?? DEFAULT_ACCESS_POLICY.block_after_days;

    const { data: stillUnpaid } = await supabaseAdmin
      .from("invoices")
      .select("due_date")
      .eq("contract_id", invoice.contract_id)
      .in("status", ["pending", "overdue"])
      .lt("due_date", now.toISOString().slice(0, 10));

    const stillBlocked = (stillUnpaid || []).some((i) => daysOverdue(i.due_date, now) > blockAfter);
    const reactivated: string[] = [];

    if (!stillBlocked) {
      const { data: licenses } = await supabaseAdmin
        .from("licenses")
        .select("id")
        .eq("contract_id", invoice.contract_id)
        .eq("status", "suspended")
        .eq("suspension_reason", "delinquency");

      for (const lic of licenses || []) {
        await supabaseAdmin
          .from("licenses")
          .update({ status: "active", suspension_reason: null, suspended_at: null })
          .eq("id", lic.id);
        reactivated.push(lic.id);
      }

      if (!stillUnpaid?.length && contract?.status === "past_due") {
        await supabaseAdmin.from("contracts").update({ status: "active" }).eq("id", invoice.contract_id);
      }
    }

    // 4. Audit trail
    await supabaseAdmin.from("audit_logs").insert({
      action: "PAYMENT_RECONCILED_WEBHOOK",
      entity_type: "invoice",
      entity_id: invoice_id,
      actor_name: "Supabase Edge Engine",
      actor_email: "system@lynuscontrol.internal",
      actor_role: "finance",
      details: { amount_paid, payment_method, reactivated_licenses: reactivated, still_blocked: stillBlocked },
    });

    return json({
      success: true,
      message: stillBlocked
        ? "Payment reconciled; other invoices still overdue, licenses remain suspended"
        : "Payment reconciled and licenses reactivated",
      invoice_id,
      reactivated_licenses: reactivated.length,
    });
  } catch (error) {
    return handleError(error);
  }
});
