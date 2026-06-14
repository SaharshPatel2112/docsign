import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabase";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { sendSigningEmail } from "../lib/sendEmail";

const router = Router();

// POST /api/share/:documentId — generate token and send email
router.post("/:documentId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { signer_email, signer_name } = req.body;
    const { documentId } = req.params;

    if (!signer_email) {
      res.status(400).json({ error: "Signer email is required" });
      return;
    }

    // Get document
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", req.userId)
      .single();

    if (docError || !doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Generate unique token
    const token = uuidv4();

    // Update signatures with token and signer info
    const { error: updateError } = await supabase
      .from("signatures")
      .update({
        signer_email,
        signer_name: signer_name || null,
        token,
        status: "pending",
      })
      .eq("document_id", documentId);

    if (updateError) {
      res.status(500).json({ error: updateError.message });
      return;
    }

    // Generate signing link
    const signingLink = `${process.env.FRONTEND_URL}/sign/${token}`;

    // Send email — don't crash if it fails
    try {
      await sendSigningEmail(signer_email, doc.file_name, signingLink);
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr);
      // Continue anyway — return the link even if email fails
    }

    res.json({
      success: true,
      signing_link: signingLink,
      message: `Signing link generated. Email may have failed — check server logs.`,
    });

    // Update document status
    await supabase
      .from("documents")
      .update({ status: "pending" })
      .eq("id", documentId);

    res.json({
      success: true,
      signing_link: signingLink,
      message: `Signing link sent to ${signer_email}`,
    });
  } catch (err) {
    console.error("Share error:", err);
    res.status(500).json({ error: "Failed to send signing link" });
  }
});

// GET /api/share/sign/:token — get document by token (public, no auth)
router.get("/sign/:token", async (req, res) => {
  try {
    const { data: signature, error } = await supabase
      .from("signatures")
      .select("*, documents(*)")
      .eq("token", req.params.token)
      .single();

    if (error || !signature) {
      res.status(404).json({ error: "Invalid or expired signing link" });
      return;
    }

    if (signature.status === "signed") {
      res.status(400).json({ error: "Document already signed" });
      return;
    }

    // Get all signatures for this document
    const { data: allSignatures } = await supabase
      .from("signatures")
      .select("*, documents(*)")
      .eq("document_id", signature.document_id);

    res.json({
      signature,
      all_signatures: allSignatures,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch signing request" });
  }
});

// POST /api/share/sign/:token/complete — mark as signed (public, no auth)
router.post("/sign/:token/complete", async (req, res) => {
  try {
    const { ip_address } = req.body;

    const { data: signature, error: findError } = await supabase
      .from("signatures")
      .select("*, documents(*)")
      .eq("token", req.params.token)
      .single();

    if (findError || !signature) {
      res.status(404).json({ error: "Invalid signing link" });
      return;
    }

    if (signature.status === "signed") {
      res.status(400).json({ error: "Already signed" });
      return;
    }

    // Mark signature as signed
    await supabase
      .from("signatures")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
        ip_address: ip_address || req.ip,
      })
      .eq("token", req.params.token);

    // Update document status
    await supabase
      .from("documents")
      .update({ status: "signed" })
      .eq("id", signature.document_id);

    res.json({ success: true, message: "Document signed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to complete signing" });
  }
});

export default router;
