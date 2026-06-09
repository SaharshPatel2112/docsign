import { Router } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { document_id, x, y, page, signer_email } = req.body;

    console.log("Received:", { document_id, x, y, page, signer_email });
    console.log("UserId:", req.userId);

    if (!document_id || x === undefined || y === undefined) {
      res.status(400).json({ error: "document_id, x, and y are required" });
      return;
    }

    const { data, error } = await supabase
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
  } catch (err) {
    console.error("Signatures route error:", err);
    res.status(500).json({ error: "Failed to save signature" });
  }
});

// GET /api/signatures/:documentId — get all signatures for a document
router.get("/:documentId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from("signatures")
      .select("*")
      .eq("document_id", req.params.documentId)
      .order("created_at", { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ signatures: data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch signatures" });
  }
});

// DELETE /api/signatures/:id — remove a signature field
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from("signatures")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.userId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete signature" });
  }
});

export default router;
