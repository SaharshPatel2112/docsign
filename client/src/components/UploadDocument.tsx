import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import api, { setAuthToken } from "../lib/axios";

export const UploadDocument = ({ onUpload }: { onUpload: () => void }) => {
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
      setSuccess(false);

      const token = await getToken();
      setAuthToken(token);

      const formData = new FormData();
      formData.append("file", file);

      await api.post("/api/docs/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(true);
      onUpload();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <label
        className={`cursor-pointer px-3 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
          uploading
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        <span className="hidden sm:inline">+ Upload PDF</span>
        <span className="inline sm:hidden">+ PDF</span>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {success && (
        <p className="text-green-400 text-xs">Uploaded successfully</p>
      )}
    </div>
  );
};
