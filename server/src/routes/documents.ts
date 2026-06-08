import { Router } from "express";
import multer from "multer";
import { supabase } from "../lib/supabase";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";

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

export default router;
