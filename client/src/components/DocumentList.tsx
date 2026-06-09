import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import api, { setAuthToken } from "../lib/axios";
import { useNavigate } from 'react-router-dom';

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  status: string;
  created_at: string;
}

interface Props {
  refresh: number;
  onSelect: (doc: Document) => void;
}

export const DocumentList = ({ refresh }: Props) => {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
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
    if (status === "signed") return "text-green-400";
    if (status === "rejected") return "text-red-400";
    return "text-yellow-400";
  };

  if (loading) return <p className="text-gray-500">Loading documents...</p>;
  if (documents.length === 0)
    return (
      <p className="text-gray-500">
        No documents yet. Upload a PDF to get started.
      </p>
    );

  return (
    <div className="flex flex-col gap-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          onClick={() => navigate(`/editor/${doc.id}`)}
          className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 cursor-pointer hover:border-blue-500 transition"
        >
          <div className="flex flex-col gap-1">
            <p className="text-white font-medium">{doc.file_name}</p>
            <p className="text-gray-500 text-sm">
              {new Date(doc.created_at).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`text-sm font-semibold uppercase ${statusColor(doc.status)}`}
          >
            {doc.status}
          </span>
        </div>
      ))}
    </div>
  );
};
