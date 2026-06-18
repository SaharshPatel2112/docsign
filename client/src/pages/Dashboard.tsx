import { useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { UploadDocument } from "../components/UploadDocument";
import { DocumentList } from "../components/DocumentList";

type FilterStatus = "all" | "pending" | "signed" | "rejected";

export const Dashboard = () => {
  const [refresh, setRefresh] = useState(0);
  const [filter, setFilter] = useState<FilterStatus>("all");

  const filters: { label: string; value: FilterStatus; color: string }[] = [
    { label: "All", value: "all", color: "text-white" },
    { label: "Pending", value: "pending", color: "text-yellow-400" },
    { label: "Signed", value: "signed", color: "text-green-400" },
    { label: "Rejected", value: "rejected", color: "text-red-400" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <img src="/docsign.svg" alt="DocSign" className="w-8 h-8" />
          <h1 className="text-2xl font-bold text-blue-400 tracking-tight">
            DocSign
          </h1>
        </div>
        <UserButton
          appearance={{ elements: { avatarBox: "w-10 h-10" } }}
          userProfileMode="modal"
          afterSignOutUrl="/login"
        />
      </nav>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
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

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-3">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
                filter === f.value
                  ? `${f.color} border-current bg-gray-800`
                  : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Document list */}
        <DocumentList refresh={refresh} filter={filter} />
      </main>
    </div>
  );
};
