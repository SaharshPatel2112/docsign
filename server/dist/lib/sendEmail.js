"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSigningEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
const sendSigningEmail = async (toEmail, documentName, signingLink) => {
    await transporter.sendMail({
        from: `"DocSign" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `You have been requested to sign: ${documentName}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Document Signing Request</h2>
        <p>You have been requested to sign the document: <strong>${documentName}</strong></p>
        <p>Click the button below to review and sign the document:</p>
        <a 
          href="${signingLink}" 
          style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;"
        >
          Review & Sign Document
        </a>
        <p style="color: #6b7280; font-size: 14px;">This link will expire in 7 days.</p>
        <p style="color: #6b7280; font-size: 14px;">If you did not expect this email, you can ignore it.</p>
      </div>
    `,
    });
};
exports.sendSigningEmail = sendSigningEmail;
