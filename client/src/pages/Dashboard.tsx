import { useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { UploadDocument } from "../components/UploadDocument";
import { DocumentList } from "../components/DocumentList";

export const Dashboard = () => {
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-blue-400 tracking-tight">
          DocSign
        </h1>
        <UserButton
          appearance={{ elements: { avatarBox: "w-10 h-10" } }}
          userProfileMode="modal"
          afterSignOutUrl="/login"
        />
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-left">My Documents</h2>
            <p className="text-gray-500 text-sm mt-1 text-left">
              Upload and manage your documents for signing
            </p>
          </div>
          <div className="flex-shrink-0">
            <UploadDocument onUpload={() => setRefresh((r) => r + 1)} />
          </div>
        </div>
        <DocumentList refresh={refresh} />
      </main>
    </div>
  );
};
