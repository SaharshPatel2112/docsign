import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import api, { setAuthToken } from "../lib/axios";
import { AuditLog } from "./AuditLog";

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  signed_file_url: string | null;
  status: string;
  created_at: string;
}

interface Props {
  refresh: number;
  filter: "all" | "pending" | "signed" | "rejected";
}

export const DocumentList = ({ refresh, filter }: Props) => {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        setAuthToken(token);
        const res = await api.get("/api/docs");
        setDocuments(res.data.documents);
      } catch (err) {
        console.error("Failed to fetch documents");
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, [refresh]);

  const statusColor = (status: string) => {
    if (status === "signed")
      return "bg-green-500 bg-opacity-20 text-green-400 border-green-500";
    if (status === "rejected")
      return "bg-red-500 bg-opacity-20 text-red-400 border-red-500";
    return "bg-yellow-500 bg-opacity-20 text-yellow-400 border-yellow-500";
  };

  const filtered =
    filter === "all" ? documents : documents.filter((d) => d.status === filter);

  if (loading)
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-900 rounded-lg animate-pulse" />
        ))}
      </div>
    );

  if (documents.length === 0)
    return (
      <div className="flex flex-col items-start justify-center py-20 gap-3">
        <p className="text-4xl">📄</p>
        <p className="text-gray-400 text-lg">No documents yet</p>
        <p className="text-gray-600 text-sm">Upload a PDF to get started</p>
      </div>
    );

  if (filtered.length === 0)
    return (
      <div className="flex flex-col items-start justify-center py-20 gap-3">
        <p className="text-4xl">🔍</p>
        <p className="text-gray-400 text-lg">No {filter} documents</p>
        <p className="text-gray-600 text-sm">
          Try a different filter or upload a new document
        </p>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      {filtered.map((doc) => (
        <div
          key={doc.id}
          className="flex flex-col bg-gray-900 border border-gray-800 rounded-lg transition hover:border-blue-500 group"
        >
          {/* Card row */}
          <div
            onClick={() =>
              doc.status === "pending" && navigate(`/editor/${doc.id}`)
            }
            className={`flex items-center justify-between px-5 py-4 transition rounded-t-lg ${
              doc.status === "pending"
                ? "cursor-pointer hover:bg-gray-800"
                : "cursor-default"
            }`}
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <span className="text-2xl flex-shrink-0">📄</span>
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-white font-medium group-hover:text-blue-400 transition truncate text-left">
                  {doc.file_name}
                </p>
                <p className="text-gray-500 text-sm text-left">
                  {new Date(doc.created_at + "Z").toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
              <span
                className={`text-xs font-semibold uppercase px-2 py-1 rounded border ${statusColor(doc.status)}`}
              >
                {doc.status}
              </span>
              {doc.status === "signed" && doc.signed_file_url && (
                <a
                  href={doc.signed_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded transition"
                >
                  ↓ Download
                </a>
              )}
              {doc.status === "rejected" && doc.file_url && (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded transition"
                >
                  ↓ Download
                </a>
              )}
              {doc.status === "pending" && (
                <span className="text-gray-600 group-hover:text-gray-400 transition text-sm">
                  →
                </span>
              )}
            </div>
          </div>

          {/* Audit log */}
          <div
            className="px-5 pb-3 border-t border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <AuditLog documentId={doc.id} />
          </div>
        </div>
      ))}
    </div>
  );
};
