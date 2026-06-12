import { Router } from "express";
import multer from "multer";
import { supabase } from "../lib/supabase";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { generateSignedPdf } from "../lib/generateSignedPdf";
import fetch from "node-fetch";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  async (req: AuthRequest, res) => {
    try {
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      if (file.mimetype !== "application/pdf") {
        res.status(400).json({ error: "Only PDF files are allowed" });
        return;
      }

      const fileName = `${req.userId}/${Date.now()}_${file.originalname}`;

      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(fileName, file.buffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (storageError) {
        res.status(500).json({ error: storageError.message });
        return;
      }

      const { data: urlData, error: signedError } = await supabase.storage
        .from("documents")
        .createSignedUrl(fileName, 60 * 60 * 24 * 7);

      if (signedError || !urlData) {
        res.status(500).json({ error: "Failed to generate URL" });
        return;
      }

      const { data: doc, error: dbError } = await supabase
        .from("documents")
        .insert({
          user_id: req.userId,
          file_name: file.originalname,
          file_url: urlData.signedUrl,
          status: "pending",
        })
        .select()
        .single();

      if (dbError) {
        res.status(500).json({ error: dbError.message });
        return;
      }

      res.status(201).json({ document: doc });
    } catch (err) {
      res.status(500).json({ error: "Upload failed" });
    }
  },
);

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ documents: data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.json({ document: data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

router.post("/:id/finalize", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .single();

    if (docError || !doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const { data: signatures, error: sigError } = await supabase
      .from("signatures")
      .select("*")
      .eq("document_id", req.params.id);

    if (sigError) {
      res.status(500).json({ error: sigError.message });
      return;
    }

    if (!signatures || signatures.length === 0) {
      res.status(400).json({ error: "No signatures found for this document" });
      return;
    }

    const pdfResponse = await fetch(doc.file_url);
    if (!pdfResponse.ok) {
      res.status(500).json({ error: "Failed to download original PDF" });
      return;
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();

    const signedPdfBytes = await generateSignedPdf(pdfBuffer, signatures);

    const signedFileName = `${req.userId}/signed_${Date.now()}_${doc.file_name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(signedFileName, signedPdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      res.status(500).json({ error: uploadError.message });
      return;
    }

    const { data: urlData, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(signedFileName, 60 * 60 * 24 * 7);

    if (urlError || !urlData) {
      res.status(500).json({ error: "Failed to generate signed URL" });
      return;
    }

    const { data: updatedDoc, error: updateError } = await supabase
      .from("documents")
      .update({
        status: "signed",
        signed_file_url: urlData.signedUrl,
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (updateError) {
      res.status(500).json({ error: updateError.message });
      return;
    }

    await supabase
      .from("signatures")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
      })
      .eq("document_id", req.params.id);

    res.json({
      document: updatedDoc,
      signed_url: urlData.signedUrl,
    });
  } catch (err) {
    console.error("Finalize error:", err);
    res.status(500).json({ error: "Failed to generate signed PDF" });
  }
});

export default router;
