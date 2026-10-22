// Supabase Edge Function: reconcile-payments
// Nightly / Scheduled cron job: marks past-due invoices as overdue and, once an invoice is
// late beyond the contract's block_after_days, suspends the contract's licenses for delinquency.
// Warning and read-only stages are not stored: `license-check` derives them live from the
// invoices (see _shared/access-policy.ts). Requires the x-cron-secret header.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, handleError, json, requireCronSecret } from "../_shared/security.ts";
import { daysOverdue, DEFAULT_ACCESS_POLICY } from "../_shared/access-policy.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    requireCronSecret(req);
    const supabaseAdmin = adminClient();

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Unpaid invoices whose due date has passed
    const { data: overdueInvoices, error: invError } = await supabaseAdmin
      .from("invoices")
      .select("id, status, due_date, contract_id, contracts(id, block_after_days)")
      .in("status", ["pending", "overdue"])
      .lt("due_date", todayStr);

    if (invError) throw invError;

    const suspendedLicenses: string[] = [];
    const pastDueContracts = new Set<string>();

    for (const inv of overdueInvoices || []) {
      if (inv.status === "pending") {
        await supabaseAdmin.from("invoices").update({ status: "overdue" }).eq("id", inv.id);
      }
      if (!inv.contract_id) continue;
      pastDueContracts.add(inv.contract_id);

      // deno-lint-ignore no-explicit-any
      const blockAfter = (inv as any).contracts?.block_after_days ?? DEFAULT_ACCESS_POLICY.block_after_days;
      if (daysOverdue(inv.due_date, now) <= blockAfter) continue;

      // Beyond the tolerance: suspend active licenses under this contract
      const { data: licenses } = await supabaseAdmin
        .from("licenses")
        .select("id")
        .eq("contract_id", inv.contract_id)
        .in("status", ["active", "grace_period"]);

      for (const lic of licenses || []) {
        await supabaseAdmin
          .from("licenses")
          .update({ status: "suspended", suspension_reason: "delinquency", suspended_at: now.toISOString() })
          .eq("id", lic.id);
        suspendedLicenses.push(lic.id);
      }
    }

    if (pastDueContracts.size > 0) {
      await supabaseAdmin
        .from("contracts")
        .update({ status: "past_due" })
        .in("id", [...pastDueContracts])
        .eq("status", "active");
    }

    if (suspendedLicenses.length > 0) {
      await supabaseAdmin.from("audit_logs").insert({
        action: "AUTO_SUSPENSION_DELINQUENCY",
        entity_type: "license",
        entity_id: suspendedLicenses.join(", "),
        actor_name: "Automated Reconciler Cron",
        actor_email: "cron@lynuscontrol.internal",
        actor_role: "finance",
        details: { suspendedCount: suspendedLicenses.length, suspendedLicenses },
      });
    }

    return json({
      success: true,
      processedOverdue: (overdueInvoices || []).length,
      contractsPastDue: pastDueContracts.size,
      licensesSuspended: suspendedLicenses.length,
    });
  } catch (error) {
    return handleError(error);
  }
});
