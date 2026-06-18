"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
// GET /api/audit/:documentId
router.get("/:documentId", requireAuth_1.requireAuth, async (req, res) => {
    try {
        // Verify document belongs to user
        const { data: doc, error: docError } = await supabase_1.supabase
            .from("documents")
            .select("id")
            .eq("id", req.params.documentId)
            .eq("user_id", req.userId)
            .single();
        if (docError || !doc) {
            res.status(404).json({ error: "Document not found" });
            return;
        }
        const { data, error } = await supabase_1.supabase
            .from("audit_logs")
            .select("*")
            .eq("document_id", req.params.documentId)
            .order("created_at", { ascending: false });
        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }
        res.json({ logs: data });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch audit logs" });
    }
});
exports.default = router;
