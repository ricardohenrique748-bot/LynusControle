// Supabase Edge Function: notify-fiscal-pending
// Scans for active enterprise clients with missing monthly fiscal documents
// (NF-e, NFS-e, SPED Fiscal) before tax submission dead-ends.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronSecret, handleError } from "../_shared/security.ts";

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

    // Scheduled job: only the scheduler (holding CRON_SECRET) may trigger it
    requireCronSecret(req);

    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Get active customers
    const { data: customers } = await supabaseAdmin
      .from("customers")
      .select("id, corporate_name, trade_name, email")
      .eq("status", "active");

    const pendingAlerts: Array<{ customerId: string; name: string }> = [];

    for (const cust of customers || []) {
      const { data: docs } = await supabaseAdmin
        .from("fiscal_documents")
        .select("id, status")
        .eq("customer_id", cust.id)
        .eq("competence_period", currentPeriod)
        .eq("status", "authorized");

      if (!docs || docs.length === 0) {
        pendingAlerts.push({ customerId: cust.id, name: cust.trade_name || cust.corporate_name });
      }
    }

    if (pendingAlerts.length > 0) {
      await supabaseAdmin.from("notifications").insert({
        title: `Pendência Fiscal: ${pendingAlerts.length} empresas sem SPED/NF-e`,
        message: `Competência ${currentPeriod}: ${pendingAlerts.map((p) => p.name).slice(0, 3).join(", ")}${
          pendingAlerts.length > 3 ? "..." : ""
        } com entrega fiscal pendente.`,
        category: "fiscal",
        severity: "warning",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        competencePeriod: currentPeriod,
        pendingCustomers: pendingAlerts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
});
