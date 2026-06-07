import { UserButton } from "@clerk/clerk-react";
import { UploadDocument } from "../components/UploadDocument";

export const Dashboard = () => {
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
          <UploadDocument onUpload={() => console.log("uploaded")} />
        </div>
        <p className="text-gray-500">
          No documents yet. Upload a PDF to get started.
        </p>
      </main>
    </div>
  );
};
