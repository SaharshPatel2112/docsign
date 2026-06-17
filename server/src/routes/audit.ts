import { Router } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";

const router = Router();

// GET /api/audit/:documentId
router.get("/:documentId", requireAuth, async (req: AuthRequest, res) => {
  try {
    // Verify document belongs to user
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", req.params.documentId)
      .eq("user_id", req.userId)
      .single();

    if (docError || !doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("document_id", req.params.documentId)
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ logs: data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

export default router;
