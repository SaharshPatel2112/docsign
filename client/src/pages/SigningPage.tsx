import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import axios from "axios";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BASE_URL = import.meta.env.VITE_API_URL;

export const SigningPage = () => {
  const { token } = useParams();
  const [signatures, setSignatures] = useState<any[]>([]);
  const [docData, setDocData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    const fetchSignature = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/share/sign/${token}`);
        setSignatures(res.data.all_signatures || [res.data.signature]);
        setDocData(res.data.signature?.documents);
      } catch (err: any) {
        setError(err.response?.data?.error || "Invalid signing link");
      } finally {
        setLoading(false);
      }
    };
    fetchSignature();
  }, [token]);

  const handleSign = async () => {
    try {
      setSigning(true);
      await axios.post(`${BASE_URL}/api/share/sign/${token}/complete`, {});
      setSigned(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to sign document");
    } finally {
      setSigning(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white">Loading document...</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-2">Invalid Link</p>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );

  if (signed)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            ✓
          </div>
          <h2 className="text-white text-2xl font-semibold">Document Signed</h2>
          <p className="text-gray-400">
            You have successfully signed the document.
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center flex flex-col gap-3">
          <p className="text-red-400 text-xl">
            {error === "Document already signed"
              ? "✓ Already Signed"
              : "Invalid Link"}
          </p>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );

  const currentPageSigs = signatures.filter((s) => s.page === pageNumber);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-blue-400">DocSign</h1>
        <div className="flex items-center gap-3">
          {numPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="px-3 py-1 bg-gray-800 rounded text-sm disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-gray-500">
                {pageNumber}/{numPages}
              </span>
              <button
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                className="px-3 py-1 bg-gray-800 rounded text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
          <button
            onClick={handleSign}
            disabled={signing}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {signing ? "Signing..." : "Sign Document"}
          </button>
        </div>
      </nav>

      <div className="flex flex-col items-center py-8 gap-4">
        <div className="bg-gray-900 rounded-lg px-6 py-3 text-center">
          <p className="text-gray-400 text-sm">You are signing:</p>
          <p className="text-white font-medium">{docData?.file_name}</p>
        </div>

        <div className="overflow-auto">
          <div style={{ position: "relative" }}>
            <Document
              file={docData?.file_url}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            >
              <Page pageNumber={pageNumber} width={700} />
            </Document>

            {currentPageSigs.map((sig, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${sig.x}%`,
                  top: `${sig.y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                }}
                className="border-2 border-blue-500 bg-blue-500 bg-opacity-20 rounded px-3 py-1 text-xs text-blue-300 pointer-events-none"
              >
                ✍ Sign here
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
