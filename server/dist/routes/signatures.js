"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
router.post("/", requireAuth_1.requireAuth, async (req, res) => {
    try {
        const { document_id, x, y, page, signer_email } = req.body;
        console.log("Received:", { document_id, x, y, page, signer_email });
        console.log("UserId:", req.userId);
        if (!document_id || x === undefined || y === undefined) {
            res.status(400).json({ error: "document_id, x, and y are required" });
            return;
        }
        const { data, error } = await supabase_1.supabase
            .from("signatures")
            .insert({
            document_id,
            user_id: req.userId,
            signer_email: signer_email || null,
            x,
            y,
            page: page || 1,
            status: "pending",
        })
            .select()
            .single();
        console.log("Insert result:", data, "Error:", error);
        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }
        res.status(201).json({ signature: data });
    }
    catch (err) {
        console.error("Signatures route error:", err);
        res.status(500).json({ error: "Failed to save signature" });
    }
});
// GET /api/signatures/:documentId — get all signatures for a document
router.get("/:documentId", requireAuth_1.requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from("signatures")
            .select("*")
            .eq("document_id", req.params.documentId)
            .order("created_at", { ascending: true });
        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }
        res.json({ signatures: data });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch signatures" });
    }
});
router.delete("/document/:documentId", requireAuth_1.requireAuth, async (req, res) => {
    try {
        const { error } = await supabase_1.supabase
            .from("signatures")
            .delete()
            .eq("document_id", req.params.documentId)
            .eq("user_id", req.userId);
        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to delete signatures" });
    }
});
exports.default = router;
