import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import api, { setAuthToken } from "../lib/axios";

interface Log {
  id: string;
  action: string;
  actor: string | null;
  ip_address: string | null;
  metadata: any;
  created_at: string;
}

const actionConfig = (action: string) => {
  switch (action) {
    case "document_uploaded":
      return { label: "Uploaded", color: "text-blue-400", icon: "📤" };
    case "document_finalized":
      return {
        label: "Finalized & Signed",
        color: "text-green-400",
        icon: "✓",
      };
    case "signing_link_sent":
      return {
        label: "Sent for Signing",
        color: "text-purple-400",
        icon: "📧",
      };
    case "document_signed":
      return { label: "Signed by Signer", color: "text-green-400", icon: "✍" };
    default:
      return { label: action, color: "text-gray-400", icon: "•" };
  }
};

export const AuditLog = ({ documentId }: { documentId: string }) => {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchLogs = async () => {
      try {
        const token = await getToken();
        setAuthToken(token);
        const res = await api.get(`/api/audit/${documentId}`);
        setLogs(res.data.logs);
      } catch (err) {
        console.error("Failed to fetch audit logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [open, documentId]);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="text-xs text-gray-500 hover:text-gray-300 transition"
      >
        {open ? "▲ Hide Audit Trail" : "▼ View Audit Trail"}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {loading ? (
            <p className="text-xs text-gray-600">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-gray-600">No activity yet.</p>
          ) : (
            logs.map((log) => {
              const { label, color, icon } = actionConfig(log.action);
              return (
                <div
                  key={log.id}
                  className="flex flex-col bg-gray-800 rounded-lg px-4 py-2 gap-0.5"
                >
                  {/* Action + Date on same row */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${color} flex items-center gap-1`}
                    >
                      <span>{icon}</span>
                      {label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.created_at + "Z").toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>

                  {/* Actor — left aligned, indented under heading */}
                  {log.actor && (
                    <span className="text-xs text-gray-400 text-left ml-1">
                      by {log.actor}
                    </span>
                  )}

                  {/* Signer email */}
                  {log.metadata?.signer_email && (
                    <span className="text-xs text-gray-500 text-left ml-1">
                      to {log.metadata.signer_email}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
