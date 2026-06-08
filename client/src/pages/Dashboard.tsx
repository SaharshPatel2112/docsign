import { useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { UploadDocument } from "../components/UploadDocument";
import { DocumentList } from "../components/DocumentList";
import { PDFPreview } from "../components/PDFPreview";

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  status: string;
  created_at: string;
}

export const Dashboard = () => {
  const [refresh, setRefresh] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-blue-400">DocSign</h1>
        <UserButton />
      </nav>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold">My Documents</h2>
          <UploadDocument onUpload={() => setRefresh((r) => r + 1)} />
        </div>
        <DocumentList
          refresh={refresh}
          onSelect={(doc) => setSelectedDoc(doc)}
        />
      </main>

      {/* PDF Preview Modal */}
      {selectedDoc && (
        <PDFPreview
          fileUrl={selectedDoc.file_url}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
};
