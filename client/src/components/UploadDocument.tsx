import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import api, { setAuthToken } from "../lib/axios";

export const UploadDocument = ({ onUpload }: { onUpload: () => void }) => {
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files allowed");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const token = await getToken();
      setAuthToken(token);

      const formData = new FormData();
      formData.append("file", file);

      await api.post("/api/docs/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onUpload();
    } catch (err) {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
        {uploading ? "Uploading..." : "Upload PDF"}
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
};
