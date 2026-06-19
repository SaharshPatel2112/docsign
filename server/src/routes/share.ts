import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabase";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { sendSigningEmail } from "../lib/sendEmail";
import { logAudit } from "../lib/audit";

const router = Router();

// POST /api/share/:documentId — generate token and send email
router.post("/:documentId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { signer_email, signer_name } = req.body;
    const { documentId } = req.params;
    const docId = Array.isArray(documentId) ? documentId[0] : documentId;

    if (!signer_email) {
      res.status(400).json({ error: "Signer email is required" });
      return;
    }

    // Get document
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", docId)
      .eq("user_id", req.userId)
      .single();

    if (docError || !doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Generate one token shared across all signature fields for this document
    const token = uuidv4();

    const { error: updateError } = await supabase
      .from("signatures")
      .update({
        signer_email,
        signer_name: signer_name || null,
        token,
        status: "pending",
      })
      .eq("document_id", docId);

    if (updateError) {
      res.status(500).json({ error: updateError.message });
      return;
    }

    const signingLink = `${process.env.FRONTEND_URL}/sign/${token}`;

    // Send email — don't crash if it fails
    try {
      await sendSigningEmail(signer_email, doc.file_name, signingLink);
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr);
    }

    await logAudit(docId, "signing_link_sent", req.userEmail, String(req.ip), {
      signer_email,
    });

    await supabase
      .from("documents")
      .update({ status: "pending" })
      .eq("id", docId);

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

    // Get all signatures for this document
    const { data: allSignatures } = await supabase
      .from("signatures")
      .select("*")
      .eq("document_id", signature.document_id);

    const doc = signature.documents as any;

    // Download original PDF
    const pdfResponse = await fetch(doc.file_url);
    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Generate signed PDF
    const { generateSignedPdf } = await import("../lib/generateSignedPdf");
    const signedPdfBytes = await generateSignedPdf(
      pdfBuffer,
      allSignatures || [signature],
    );

    // Upload signed PDF
    const signedFileName = `signed_${Date.now()}_${doc.file_name}`;
    await supabase.storage
      .from("documents")
      .upload(signedFileName, signedPdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    const { data: urlData } = await supabase.storage
      .from("documents")
      .createSignedUrl(signedFileName, 60 * 60 * 24 * 7);

    // Update signature
    await supabase
      .from("signatures")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
        ip_address: req.ip || "",
      })
      .eq("token", req.params.token);

    // Update document
    await supabase
      .from("documents")
      .update({
        status: "signed",
        signed_file_url: urlData?.signedUrl || doc.file_url,
      })
      .eq("id", signature.document_id);

    await logAudit(
      signature.document_id,
      "document_signed",
      String(signature.signer_email),
      String(req.ip),
      { token: req.params.token },
    );

    res.json({ success: true, message: "Document signed successfully" });
  } catch (err) {
    console.error("Sign complete error:", err);
    res.status(500).json({ error: "Failed to complete signing" });
  }
});

// POST /api/share/sign/:token/reject — signer rejects
router.post("/sign/:token/reject", async (req, res) => {
  try {
    const { reason } = req.body;

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
      res.status(400).json({ error: "Document already signed" });
      return;
    }

    if (signature.status === "rejected") {
      res.status(400).json({ error: "Document already rejected" });
      return;
    }

    await supabase
      .from("signatures")
      .update({
        status: "rejected",
        signed_at: new Date().toISOString(),
        ip_address: req.ip || "",
      })
      .eq("token", req.params.token);

    await supabase
      .from("documents")
      .update({ status: "rejected" })
      .eq("id", signature.document_id);

    await logAudit(
      signature.document_id,
      "document_rejected",
      String(signature.signer_email),
      String(req.ip),
      { reason: reason || "No reason provided" },
    );

    res.json({ success: true, message: "Document rejected" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject document" });
  }
});

export default router;
