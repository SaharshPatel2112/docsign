import { supabase } from "./supabase";

export const logAudit = async (
  document_id: string,
  action: string,
  actor?: string | string[] | null,
  ip_address?: string | string[] | null,
  metadata?: Record<string, any>,
) => {
  const actorValue = Array.isArray(actor) ? actor[0] : (actor ?? null);
  const ipValue = Array.isArray(ip_address)
    ? ip_address[0]
    : (ip_address ?? null);

  console.log("Logging audit:", { document_id, action, actorValue, ipValue });

  const { data, error } = await supabase.from("audit_logs").insert({
    document_id,
    action,
    actor: actorValue,
    ip_address: ipValue,
    metadata: metadata || null,
  });

  console.log("Audit result:", data, "Error:", error);
};
