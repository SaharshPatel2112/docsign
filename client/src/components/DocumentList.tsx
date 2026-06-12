import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import api, { setAuthToken } from "../lib/axios";

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
}

export const DocumentList = ({ refresh }: Props) => {
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

  return (
    <div className="flex flex-col gap-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          onClick={() => navigate(`/editor/${doc.id}`)}
          className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <span className="text-2xl flex-shrink-0">📄</span>
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-white font-medium group-hover:text-blue-400 transition truncate text-left">
                {doc.file_name}
              </p>
              <p className="text-gray-500 text-sm text-left">
                {new Date(doc.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
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
            <span className="text-gray-600 group-hover:text-gray-400 transition text-sm">
              →
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
