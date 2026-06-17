import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Document, Page, pdfjs } from "react-pdf";
import api, { setAuthToken } from "../lib/axios";
import { SignatureField } from "../components/SignatureField";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SignatureFieldData {
  id: string;
  x: number;
  y: number;
  page: number;
  saved?: boolean;
}

export const DocumentEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [signatures, setSignatures] = useState<SignatureFieldData[]>([]);
  const [signerEmail, setSignerEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [placingMode, setPlacingMode] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const handleDrag = (sigId: string, x: number, y: number) => {
    setSignatures((prev) =>
      prev.map((sig) =>
        sig.id === sigId ? { ...sig, x, y, saved: false } : sig,
      ),
    );
  };

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const token = await getToken();
        setAuthToken(token);
        const res = await api.get(`/api/docs/${id}`);
        setFileUrl(res.data.document.file_url);
        setFileName(res.data.document.file_name);

        const sigRes = await api.get(`/api/signatures/${id}`);
        const saved = sigRes.data.signatures.map((s: any) => ({
          id: s.id,
          x: s.x,
          y: s.y,
          page: s.page,
          saved: true,
        }));
        setSignatures(saved);
      } catch (err) {
        console.error("Failed to load document");
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMode) return;
    if ((e.target as HTMLElement).closest(".group")) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setSignatures((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        x,
        y,
        page: pageNumber,
        saved: false,
      },
    ]);

    setPlacingMode(false);
  };

  const handleRemove = (index: number) => {
    setSignatures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinalize = async () => {
    try {
      setFinalizing(true);
      const token = await getToken();
      setAuthToken(token);

      // Save signatures first
      await api.delete(`/api/signatures/document/${id}`);
      for (const sig of signatures) {
        await api.post("/api/signatures", {
          document_id: id,
          x: sig.x,
          y: sig.y,
          page: sig.page,
          signer_email: signerEmail || null,
        });
      }

      const res = await api.post(`/api/docs/${id}/finalize`);

      // Open the signed PDF for download/review
      window.open(res.data.signed_url, "_blank");
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Finalize failed:", err.response?.data || err.message);
      alert(err.response?.data?.error || "Failed to generate signed PDF");
    } finally {
      setFinalizing(false);
    }
  };

  const handleShare = async () => {
    if (!signerEmail) {
      alert("Please enter a signer email first");
      return;
    }
    try {
      setSharing(true);
      const token = await getToken();
      setAuthToken(token);

      // Save signatures first
      await api.delete(`/api/signatures/document/${id}`);
      for (const sig of signatures) {
        await api.post("/api/signatures", {
          document_id: id,
          x: sig.x,
          y: sig.y,
          page: sig.page,
          signer_email: signerEmail,
        });
      }

      const res = await api.post(`/api/share/${id}`, {
        signer_email: signerEmail,
      });

      const link = res.data.signing_link;

      // Copy to clipboard
      await navigator.clipboard.writeText(link);
      setShareLink(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to send signing link");
    } finally {
      setSharing(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      setAuthToken(token);

      await api.delete(`/api/signatures/document/${id}`);

      for (const sig of signatures) {
        await api.post("/api/signatures", {
          document_id: id,
          x: sig.x,
          y: sig.y,
          page: sig.page,
          signer_email: signerEmail || null,
        });
      }

      // Stay on page — just mark all as saved
      setSignatures((prev) => prev.map((s) => ({ ...s, saved: true })));
    } catch (err: any) {
      console.error("Save failed:", err.response?.data || err.message);
      alert("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white">Loading document...</p>
      </div>
    );

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Navbar */}
      <nav className="flex-shrink-0 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-gray-800">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-gray-400 hover:text-white text-sm whitespace-nowrap"
        >
          ← Back
        </button>
        <h1 className="text-sm sm:text-lg font-semibold truncate max-w-[200px] sm:max-w-sm mx-4">
          {fileName}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || finalizing}
            className="flex-shrink-0 border border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white px-3 sm:px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleFinalize}
            disabled={finalizing || saving}
            className="flex-shrink-0 bg-green-600 hover:bg-green-700 px-3 sm:px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {finalizing ? "Generating..." : "✓ Finalize & Sign"}
          </button>
          <button
            onClick={handleShare}
            disabled={sharing || saving || finalizing}
            className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 px-3 sm:px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {sharing ? "Sending..." : "📧 Send for Signing"}
          </button>
        </div>
      </nav>

      {shareLink && (
        <div className="flex-shrink-0 flex items-center justify-between bg-purple-900 border-b border-purple-700 px-6 py-3 gap-4">
          <p className="text-purple-200 text-sm truncate">{shareLink}</p>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(shareLink);
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
            }}
            className="flex-shrink-0 bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded-lg transition"
          >
            {linkCopied ? "✓ Copied!" : "Copy Link"}
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex-shrink-0 w-64 border-r border-gray-800 flex flex-col overflow-hidden">
          {/* Static controls */}
          <div className="p-4 flex flex-col gap-3 border-b border-gray-800">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Signer Email
              </label>
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="signer@example.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setPlacingMode((prev) => !prev)}
              className={`w-full py-2 rounded-lg text-sm font-medium border transition ${
                placingMode
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-900 border-gray-700 text-gray-300 hover:border-blue-500"
              }`}
            >
              {placingMode
                ? "🖱 Click PDF to place..."
                : "+ Add Signature Field"}
            </button>
            <div>
              <p className="text-xs text-gray-500">
                Click PDF to place a field
              </p>
              <p className="text-xs text-gray-500">Drag fields to reposition</p>
              <p className="text-xs text-gray-600 mt-1">
                {signatures.filter((s) => s.page === pageNumber).length}{" "}
                field(s) on this page
              </p>
            </div>
          </div>

          {/* Signature fields list — scrollable */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {(() => {
              const visible = showAllFields
                ? signatures
                : signatures.slice(0, 7);
              return (
                <>
                  {visible.map((sig, i) => (
                    <div
                      key={sig.id}
                      className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2"
                    >
                      <span className="text-xs text-gray-400">
                        Field {i + 1} — Page {sig.page}
                        {!sig.saved && (
                          <span className="ml-1 text-yellow-500">●</span>
                        )}
                      </span>
                      <button
                        onClick={() => handleRemove(i)}
                        className="text-red-400 hover:text-red-300 text-xs ml-2 flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {signatures.length > 7 && (
                    <button
                      onClick={() => setShowAllFields((p) => !p)}
                      className="text-xs text-blue-400 hover:text-blue-300 text-left mt-1"
                    >
                      {showAllFields
                        ? "Show less"
                        : `+ ${signatures.length - 7} more`}
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          {/* Page controls — pinned to bottom */}
          {numPages > 1 && (
            <div className="flex-shrink-0 flex items-center gap-2 p-4 border-t border-gray-800">
              <button
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="flex-1 py-2 bg-gray-800 rounded text-sm disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {pageNumber}/{numPages}
              </span>
              <button
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                className="flex-1 py-2 bg-gray-800 rounded text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* PDF area */}
        <div className="flex-1 overflow-auto bg-gray-900">
          <div className="p-6 w-fit min-w-full">
            <div
              ref={containerRef}
              onClick={handlePageClick}
              style={{ position: "relative" }}
              className={placingMode ? "cursor-crosshair" : "cursor-default"}
            >
              <Document
                file={fileUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              >
                <Page pageNumber={pageNumber} width={600} />
              </Document>

              {signatures
                .filter((s) => s.page === pageNumber)
                .map((sig, i) => (
                  <SignatureField
                    key={sig.id}
                    id={sig.id}
                    x={sig.x}
                    y={sig.y}
                    index={i}
                    onRemove={handleRemove}
                    onDrag={handleDrag}
                    containerRef={containerRef}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
