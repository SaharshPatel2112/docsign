import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface SignatureField {
  x: number;
  y: number;
  page: number;
  signer_email: string | null;
}

export const generateSignedPdf = async (
  pdfBytes: ArrayBuffer,
  signatures: SignatureField[],
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const sig of signatures) {
    const pageIndex = (sig.page || 1) - 1;
    const page = pages[pageIndex];
    if (!page) continue;

    const { width, height } = page.getSize();

    const x = (sig.x / 100) * width;
    const y = height - (sig.y / 100) * height;

    // Draw signature box
    page.drawRectangle({
      x: x - 60,
      y: y - 15,
      width: 120,
      height: 30,
      borderColor: rgb(0.2, 0.4, 0.9),
      borderWidth: 1.5,
      color: rgb(0.9, 0.93, 1),
      opacity: 0.8,
    });

    // Use plain text only — no special characters
    page.drawText("Signed", {
      x: x - 20,
      y: y - 5,
      size: 11,
      font,
      color: rgb(0.1, 0.3, 0.8),
    });

    // Draw signer email below if available
    if (sig.signer_email) {
      page.drawText(sig.signer_email, {
        x: x - 55,
        y: y - 25,
        size: 7,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }

  return pdfDoc.save();
};
