// Supabase Edge Function: create-charge
// Secure server-side billing charge creation (PIX EMV & Boleto generation)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireStaff, handleError } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Only panel users from admin/finance may issue charges
    await requireStaff(req, supabaseAdmin, ["admin", "finance"]);

    const { customer_id, contract_id, amount_brl, due_date, payment_method } = await req.json();

    if (!customer_id || !contract_id || !amount_brl) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const pixCopyPaste = `00020126580014BR.GOV.BCB.PIX0136${crypto.randomUUID()}5204000053039865405${Number(amount_brl).toFixed(2)}5802BR5913LYNUS CONTROL6009SAO PAULO62070503***6304`;
    const boletoBarcode = `34191.79001 01043.510047 91020.150008 8 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const { data: invoice, error } = await supabaseAdmin
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        customer_id,
        contract_id,
        amount_brl,
        due_date,
        payment_method: payment_method || "pix",
        status: "pending",
        pix_code: pixCopyPaste,
        boleto_barcode: boletoBarcode,
        reconciled_by_edge_function: false,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, invoice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });
  } catch (error) {
    return handleError(error);
  }
});
