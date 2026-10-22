// Supabase Edge Function: manage-license
// Privileged license administration from the Lynus Control panel (admin / support only):
// issuing new keys, manual suspension/reactivation and hardware binding resets.
// Customer systems never call this function — they use `license-check`.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, handleError, HttpError, json, requireStaff } from "../_shared/security.ts";
import { generateLicenseKey } from "../_shared/license-key.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = adminClient();
    const body = await req.json().catch(() => ({}));
    const { action, license_id, customer_id, system_id, contract_id } = body;

    // Suspension/reactivation is also allowed to finance (delinquent accounts)
    const roles = action === "suspend" || action === "reactivate"
      ? ["admin", "support", "finance"] as const
      : ["admin", "support"] as const;
    const actor = await requireStaff(req, supabaseAdmin, [...roles]);

    const audit = (actionName: string, entityId: string, details: Record<string, unknown>) =>
      supabaseAdmin.from("audit_logs").insert({
        action: actionName,
        entity_type: "license",
        entity_id: entityId,
        actor_name: actor.name,
        actor_email: actor.email,
        actor_role: actor.role,
        details,
      });

    if (action === "issue_new") {
      if (!customer_id || !system_id || !contract_id) throw new HttpError(400, "Parâmetros obrigatórios ausentes");

      const { data: system } = await supabaseAdmin.from("systems").select("code").eq("id", system_id).single();
      // "LYN-FROTA" -> "FRO"
      const prefix = String(system?.code ?? "ERP").replace(/^LYN-?/i, "") || "ERP";
      const license_key = generateLicenseKey(prefix);
      const expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      const { data: license, error } = await supabaseAdmin
        .from("licenses")
        .insert({
          license_key,
          customer_id,
          system_id,
          contract_id,
          status: "active",
          max_instances: 3,
          active_instances: 0,
          hardware_fingerprints: [],
          offline_lease_days: 15,
          expires_at,
          feature_flags: {},
        })
        .select()
        .single();

      if (error) throw error;
      await audit("LICENSE_ISSUED", license.id, { license_key });
      return json({ success: true, license }, 201);
    }

    if (!license_id) throw new HttpError(400, "license_id obrigatório");

    if (action === "suspend") {
      await supabaseAdmin
        .from("licenses")
        .update({ status: "suspended", suspension_reason: "manual", suspended_at: new Date().toISOString() })
        .eq("id", license_id);
      await audit("LICENSE_SUSPENDED_MANUAL", license_id, {});
      return json({ success: true });
    }

    if (action === "reactivate") {
      await supabaseAdmin
        .from("licenses")
        .update({ status: "active", suspension_reason: null, suspended_at: null })
        .eq("id", license_id);
      await audit("LICENSE_REACTIVATED_MANUAL", license_id, {});
      return json({ success: true });
    }

    if (action === "reset_hardware") {
      await supabaseAdmin
        .from("licenses")
        .update({ hardware_fingerprints: [], active_instances: 0 })
        .eq("id", license_id);
      await audit("LICENSE_HARDWARE_RESET", license_id, {});
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    return handleError(error);
  }
});
