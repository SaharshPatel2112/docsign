"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const supabase_1 = require("../lib/supabase");
const requireAuth_1 = require("../middleware/requireAuth");
const generateSignedPdf_1 = require("../lib/generateSignedPdf");
const node_fetch_1 = __importDefault(require("node-fetch"));
const audit_1 = require("../lib/audit");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.post("/upload", requireAuth_1.requireAuth, upload.single("file"), async (req, res) => {
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
        const { error: storageError } = await supabase_1.supabase.storage
            .from("documents")
            .upload(fileName, file.buffer, {
            contentType: "application/pdf",
            upsert: false,
        });
        if (storageError) {
            res.status(500).json({ error: storageError.message });
            return;
        }
        const { data: urlData, error: signedError } = await supabase_1.supabase.storage
            .from("documents")
            .createSignedUrl(fileName, 60 * 60 * 24 * 7);
        if (signedError || !urlData) {
            res.status(500).json({ error: "Failed to generate URL" });
            return;
        }
        console.log("userEmail before insert:", req.userEmail);
        const { data: doc, error: dbError } = await supabase_1.supabase
            .from("documents")
            .insert({
            user_id: req.userId,
            owner_email: req.userEmail || null,
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
        await (0, audit_1.logAudit)(doc.id, "document_uploaded", req.userEmail, String(req.ip), { file_name: file.originalname });
        res.status(201).json({ document: doc });
    }
    catch (err) {
        res.status(500).json({ error: "Upload failed" });
    }
});
router.get("/", requireAuth_1.requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from("documents")
            .select("*")
            .eq("user_id", req.userId)
            .order("created_at", { ascending: false });
        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }
        res.json({ documents: data });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch documents" });
    }
});
router.get("/:id", requireAuth_1.requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabase
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
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch document" });
    }
});
router.post("/:id/finalize", requireAuth_1.requireAuth, async (req, res) => {
    try {
        const docId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        const { data: doc, error: docError } = await supabase_1.supabase
            .from("documents")
            .select("*")
            .eq("id", req.params.id)
            .eq("user_id", req.userId)
            .single();
        if (docError || !doc) {
            res.status(404).json({ error: "Document not found" });
            return;
        }
        const { data: signatures, error: sigError } = await supabase_1.supabase
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
        const pdfResponse = await (0, node_fetch_1.default)(doc.file_url);
        if (!pdfResponse.ok) {
            res.status(500).json({ error: "Failed to download original PDF" });
            return;
        }
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const signedPdfBytes = await (0, generateSignedPdf_1.generateSignedPdf)(pdfBuffer, signatures);
        const signedFileName = `${req.userId}/signed_${Date.now()}_${doc.file_name}`;
        const { error: uploadError } = await supabase_1.supabase.storage
            .from("documents")
            .upload(signedFileName, signedPdfBytes, {
            contentType: "application/pdf",
            upsert: false,
        });
        if (uploadError) {
            res.status(500).json({ error: uploadError.message });
            return;
        }
        const { data: urlData, error: urlError } = await supabase_1.supabase.storage
            .from("documents")
            .createSignedUrl(signedFileName, 60 * 60 * 24 * 7);
        if (urlError || !urlData) {
            res.status(500).json({ error: "Failed to generate signed URL" });
            return;
        }
        const { data: updatedDoc, error: updateError } = await supabase_1.supabase
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
        await supabase_1.supabase
            .from("signatures")
            .update({
            status: "signed",
            signed_at: new Date().toISOString(),
        })
            .eq("document_id", req.params.id);
        await (0, audit_1.logAudit)(docId, "document_finalized", req.userEmail, String(req.ip), {
            signed_file_url: urlData.signedUrl,
        });
        res.json({
            document: updatedDoc,
            signed_url: urlData.signedUrl,
        });
    }
    catch (err) {
        console.error("Finalize error:", err);
        res.status(500).json({ error: "Failed to generate signed PDF" });
    }
});
exports.default = router;
