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

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Save failed:", err.response?.data || err.message);
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Back
        </button>
        <h1 className="text-lg font-semibold truncate max-w-sm">{fileName}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Signatures"}
        </button>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r border-gray-800 p-5 flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">
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
            {placingMode ? "🖱 Click PDF to place..." : "+ Add Signature Field"}
          </button>

          <div>
            <p className="text-sm text-gray-400 mb-1">
              Click PDF to place a field
            </p>
            <p className="text-sm text-gray-400">Drag fields to reposition</p>
            <p className="text-xs text-gray-600 mt-1">
              {signatures.filter((s) => s.page === pageNumber).length} field(s)
              on this page
            </p>
          </div>

          {/* Fields list */}
          <div className="flex flex-col gap-2 overflow-y-auto">
            {signatures.map((sig, i) => (
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
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Page controls */}
          {numPages > 1 && (
            <div className="flex items-center gap-2 mt-auto">
              <button
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="flex-1 py-2 bg-gray-800 rounded text-sm disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-gray-500">
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

        {/* PDF Canvas */}
        <div className="flex-1 overflow-auto flex justify-center p-8 bg-gray-900">
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
              <Page pageNumber={pageNumber} width={700} />
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
  );
};
