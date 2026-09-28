import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { ROLE_LABELS, type RecipientOption } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (conversationId: string) => void;
  initialRecipientId?: string;
  initialSubject?: string;
}

export default function NewMessageModal({
  isOpen,
  onClose,
  onSuccess,
  initialRecipientId,
  initialSubject,
}: Props) {
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState(initialRecipientId || "");
  const [subject, setSubject] = useState(initialSubject || "");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRecipients(recipientSearch);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialRecipientId) {
      setSelectedRecipientId(initialRecipientId);
    }
    if (initialSubject) {
      setSubject(initialSubject);
    }
  }, [initialRecipientId, initialSubject]);

  const fetchRecipients = async (search: string) => {
    try {
      setLoadingRecipients(true);
      const data = await api.messages.recipients(search);
      setRecipients(data || []);
    } catch (err: unknown) {
      console.error("Failed to load recipients:", err);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setRecipientSearch(val);
    fetchRecipients(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId) {
      setError("Please select a recipient.");
      return;
    }
    if (!content.trim()) {
      setError("Message content cannot be empty.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.messages.start({
        recipientId: selectedRecipientId,
        subject: subject.trim() || undefined,
        content: content.trim(),
      });
      onSuccess(res.conversation.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem"
    }}>
      <div className="modal-container" style={{
        background: "var(--clr-surface)",
        border: "1px solid var(--clr-border)",
        borderRadius: "var(--radius-lg)",
        width: "100%", maxWidth: "560px",
        overflow: "hidden",
        boxShadow: "var(--shadow-lg)",
        animation: "modalFadeIn 0.2s ease"
      }}>
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid var(--clr-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--clr-primary)" }}>✉</span> New Direct Message
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "var(--clr-text-muted)",
              fontSize: "1.25rem", cursor: "pointer", padding: "0.25rem"
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && (
            <div style={{
              padding: "0.75rem 1rem", borderRadius: "var(--radius)",
              background: "rgba(239, 68, 68, 0.12)", border: "1px solid var(--clr-danger)",
              color: "#fca5a5", fontSize: "0.875rem"
            }}>
              {error}
            </div>
          )}

          {/* Recipient Selector */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: "0.4rem" }}>
              Recipient <span style={{ color: "var(--clr-danger)" }}>*</span>
            </label>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input
                type="text"
                placeholder="Search teacher, adviser, parent, or student..."
                value={recipientSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{
                  flex: 1, padding: "0.55rem 0.75rem", borderRadius: "var(--radius-sm)",
                  background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)",
                  color: "var(--clr-text)", fontSize: "0.875rem"
                }}
              />
            </div>

            <select
              value={selectedRecipientId}
              onChange={(e) => setSelectedRecipientId(e.target.value)}
              required
              disabled={loadingRecipients}
              style={{
                width: "100%", padding: "0.6rem 0.75rem", borderRadius: "var(--radius-sm)",
                background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)",
                color: "var(--clr-text)", fontSize: "0.875rem"
              }}
            >
              <option value="">
                {loadingRecipients ? "Searching school directory..." : `-- Choose a contact (${recipients.length} found) --`}
              </option>
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.firstName} {r.lastName} ({ROLE_LABELS[r.role] || r.role}) — {r.email}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: "0.4rem" }}>
              Subject / Topic
            </label>
            <input
              type="text"
              placeholder="e.g. Attendance Clarification, Quarterly Progress, Excuse Slip"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{
                width: "100%", padding: "0.6rem 0.75rem", borderRadius: "var(--radius-sm)",
                background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)",
                color: "var(--clr-text)", fontSize: "0.875rem"
              }}
            />
          </div>

          {/* Message Content */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: "0.4rem" }}>
              Message <span style={{ color: "var(--clr-danger)" }}>*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Type your message here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              style={{
                width: "100%", padding: "0.75rem", borderRadius: "var(--radius-sm)",
                background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)",
                color: "var(--clr-text)", fontSize: "0.875rem", resize: "vertical"
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "0.55rem 1rem", borderRadius: "var(--radius)",
                background: "transparent", border: "1px solid var(--clr-border)",
                color: "var(--clr-text-muted)", fontWeight: 500, fontSize: "0.875rem"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.55rem 1.25rem", borderRadius: "var(--radius)",
                background: "var(--clr-primary)", border: "none",
                color: "#fff", fontWeight: 600, fontSize: "0.875rem",
                display: "flex", alignItems: "center", gap: "0.5rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
