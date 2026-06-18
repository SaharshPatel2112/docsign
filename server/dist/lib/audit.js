"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = void 0;
const supabase_1 = require("./supabase");
const logAudit = async (document_id, action, actor, ip_address, metadata) => {
    const actorValue = Array.isArray(actor) ? actor[0] : (actor ?? null);
    const ipValue = Array.isArray(ip_address)
        ? ip_address[0]
        : (ip_address ?? null);
    console.log("Logging audit:", { document_id, action, actorValue, ipValue });
    const { data, error } = await supabase_1.supabase.from("audit_logs").insert({
        document_id,
        action,
        actor: actorValue,
        ip_address: ipValue,
        metadata: metadata || null,
    });
    console.log("Audit result:", data, "Error:", error);
};
exports.logAudit = logAudit;
