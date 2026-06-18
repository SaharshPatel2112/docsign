"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const supabase_1 = require("../lib/supabase");
const requireAuth_1 = require("../middleware/requireAuth");
const sendEmail_1 = require("../lib/sendEmail");
const audit_1 = require("../lib/audit");
const router = (0, express_1.Router)();
// POST /api/share/:documentId — generate token and send email
router.post("/:documentId", requireAuth_1.requireAuth, async (req, res) => {
    try {
        const { signer_email, signer_name } = req.body;
        const { documentId } = req.params;
        const docId = Array.isArray(documentId) ? documentId[0] : documentId;
        if (!signer_email) {
            res.status(400).json({ error: "Signer email is required" });
            return;
        }
        // Get document
        const { data: doc, error: docError } = await supabase_1.supabase
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
        const token = (0, uuid_1.v4)();
        // Update signatures with token and signer info
        const { error: updateError } = await supabase_1.supabase
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
            await (0, sendEmail_1.sendSigningEmail)(signer_email, doc.file_name, signingLink);
        }
        catch (emailErr) {
            console.error("Email sending failed:", emailErr);
            // Continue anyway — return the link even if email fails
        }
        await (0, audit_1.logAudit)(docId, "signing_link_sent", req.userEmail, String(req.ip), {
            signer_email,
        });
        res.json({
            success: true,
            signing_link: signingLink,
            message: `Signing link generated. Email may have failed — check server logs.`,
        });
        // Update document status
        await supabase_1.supabase
            .from("documents")
            .update({ status: "pending" })
            .eq("id", documentId);
        res.json({
            success: true,
            signing_link: signingLink,
            message: `Signing link sent to ${signer_email}`,
        });
    }
    catch (err) {
        console.error("Share error:", err);
        res.status(500).json({ error: "Failed to send signing link" });
    }
});
// GET /api/share/sign/:token — get document by token (public, no auth)
router.get("/sign/:token", async (req, res) => {
    try {
        const { data: signature, error } = await supabase_1.supabase
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
        const { data: allSignatures } = await supabase_1.supabase
            .from("signatures")
            .select("*, documents(*)")
            .eq("document_id", signature.document_id);
        res.json({
            signature,
            all_signatures: allSignatures,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch signing request" });
    }
});
// POST /api/share/sign/:token/complete — mark as signed (public, no auth)
router.post("/sign/:token/complete", async (req, res) => {
    try {
        const { data: signature, error: findError } = await supabase_1.supabase
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
        const { data: allSignatures } = await supabase_1.supabase
            .from("signatures")
            .select("*")
            .eq("document_id", signature.document_id);
        const doc = signature.documents;
        // Download original PDF
        const pdfResponse = await fetch(doc.file_url);
        const pdfBuffer = await pdfResponse.arrayBuffer();
        // Generate signed PDF
        const { generateSignedPdf } = await Promise.resolve().then(() => __importStar(require("../lib/generateSignedPdf")));
        const signedPdfBytes = await generateSignedPdf(pdfBuffer, allSignatures || [signature]);
        // Upload signed PDF
        const signedFileName = `signed_${Date.now()}_${doc.file_name}`;
        await supabase_1.supabase.storage
            .from("documents")
            .upload(signedFileName, signedPdfBytes, {
            contentType: "application/pdf",
            upsert: false,
        });
        const { data: urlData } = await supabase_1.supabase.storage
            .from("documents")
            .createSignedUrl(signedFileName, 60 * 60 * 24 * 7);
        // Update signature
        await supabase_1.supabase
            .from("signatures")
            .update({
            status: "signed",
            signed_at: new Date().toISOString(),
            ip_address: req.ip || "",
        })
            .eq("token", req.params.token);
        // Update document
        await supabase_1.supabase
            .from("documents")
            .update({
            status: "signed",
            signed_file_url: urlData?.signedUrl || doc.file_url,
        })
            .eq("id", signature.document_id);
        await (0, audit_1.logAudit)(signature.document_id, "document_signed", String(signature.signer_email), String(req.ip), { token: req.params.token });
        res.json({ success: true, message: "Document signed successfully" });
    }
    catch (err) {
        console.error("Sign complete error:", err);
        res.status(500).json({ error: "Failed to complete signing" });
    }
});
// POST /api/share/sign/:token/reject — signer rejects
router.post("/sign/:token/reject", async (req, res) => {
    try {
        const { reason } = req.body;
        const { data: signature, error: findError } = await supabase_1.supabase
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
        await supabase_1.supabase
            .from("signatures")
            .update({
            status: "rejected",
            signed_at: new Date().toISOString(),
            ip_address: req.ip || "",
        })
            .eq("token", req.params.token);
        await supabase_1.supabase
            .from("documents")
            .update({ status: "rejected" })
            .eq("id", signature.document_id);
        await (0, audit_1.logAudit)(signature.document_id, "document_rejected", String(signature.signer_email), String(req.ip), { reason: reason || "No reason provided" });
        res.json({ success: true, message: "Document rejected" });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to reject document" });
    }
});
exports.default = router;
