import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { ROLE_LABELS, type Announcement, type AnnouncementPriority, type AnnouncementScope } from "@/types";
import NewAnnouncementModal from "./NewAnnouncementModal";

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedScope, setSelectedScope] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canPost = user?.role === "super_admin" || user?.role === "registrar" || user?.role === "teacher";

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.announcements.list({
        search: search.trim() || undefined,
        scope: (selectedScope as AnnouncementScope) || undefined,
        priority: (selectedPriority as AnnouncementPriority) || undefined,
      });
      setAnnouncements(res.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load announcements";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScope, selectedPriority]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this announcement?")) return;
    try {
      setDeletingId(id);
      await api.announcements.delete(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete announcement.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatScopeLabel = (a: Announcement) => {
    switch (a.scope) {
      case "school_wide":
        return "🌐 School-Wide";
      case "jhs":
        return "🏫 Junior High (Grades 7–10)";
      case "shs":
        return "🎓 Senior High (Grades 11–12)";
      case "grade_level":
        return `🎯 Grade ${a.targetGrade}`;
      case "section":
        return `👥 Section ${a.sectionName || ""}`;
      default:
        return a.scope;
    }
  };

  const getPriorityBadge = (p: AnnouncementPriority) => {
    switch (p) {
      case "urgent":
        return <span className="badge badge-danger">🚨 Urgent Bulletin</span>;
      case "advisory":
        return <span className="badge badge-warning">⚠️ DepEd Advisory</span>;
      default:
        return <span className="badge badge-info">ℹ️ General Notice</span>;
    }
  };

  return (
    <>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>📢 School Bulletin & Announcements</h1>
          <p>
            Official school announcements, DepEd division advisories, and section notices.
          </p>
        </div>

        {canPost && (
          <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>
            + Post Announcement
          </button>
        )}
      </div>

      <div className="page-body">
        {/* ── Filter & Search Toolbar ───────────────────────────────────────── */}
        <div className="card mb-6" style={{ padding: "0.85rem 1.25rem" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: "1 1 240px" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search bulletins by title, keyword, or author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ width: "180px" }}>
              <select
                className="form-select"
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
              >
                <option value="">All Scopes</option>
                <option value="school_wide">School-Wide</option>
                <option value="jhs">Junior High (7–10)</option>
                <option value="shs">Senior High (11–12)</option>
                <option value="grade_level">Grade Level</option>
                <option value="section">Class Section</option>
              </select>
            </div>

            <div style={{ width: "160px" }}>
              <select
                className="form-select"
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="advisory">Advisory</option>
                <option value="normal">General</option>
              </select>
            </div>

            <button type="submit" className="btn btn-outline">
              Filter
            </button>
          </form>
        </div>

        {error && (
          <div className="card mb-6" style={{ borderLeft: "4px solid var(--clr-danger)", background: "rgba(239,68,68,0.08)" }}>
            <span style={{ color: "var(--clr-danger)" }}>⚠️ {error}</span>
          </div>
        )}

        {/* ── Announcements Feed ────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--clr-text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem auto" }} />
            Loading school bulletins...
          </div>
        ) : announcements.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3.5rem 1rem", color: "var(--clr-text-muted)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📭</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--clr-text)" }}>
              No announcements found
            </div>
            <p style={{ maxWidth: "400px", margin: "0.5rem auto 1.5rem auto", fontSize: "0.875rem" }}>
              There are currently no active bulletins matching your filters.
            </p>
            {canPost && (
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingItem(null); setShowModal(true); }}>
                + Post First Announcement
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {announcements.map((item) => {
              const isAuthor = user?.id === item.authorId;
              const isManager = user?.role === "super_admin" || user?.role === "registrar";
              const canModify = isAuthor || isManager;

              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    borderLeft: item.isPinned
                      ? "4px solid var(--clr-primary)"
                      : item.priority === "urgent"
                      ? "4px solid var(--clr-danger)"
                      : item.priority === "advisory"
                      ? "4px solid var(--clr-warning)"
                      : "4px solid var(--clr-border)",
                    boxShadow: item.isPinned ? "0 4px 18px rgba(37,99,235,0.12)" : undefined,
                    transition: "transform 0.2s ease",
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      {item.isPinned && (
                        <span className="badge" style={{ background: "rgba(37,99,235,0.18)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.3)" }}>
                          📌 Pinned
                        </span>
                      )}
                      {getPriorityBadge(item.priority)}
                      <span className="badge" style={{ background: "var(--clr-surface-2)", color: "var(--clr-text-muted)" }}>
                        {formatScopeLabel(item)}
                      </span>
                    </div>

                    {/* Metadata & Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "0.775rem", color: "var(--clr-text-muted)" }}>
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {canModify && (
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                            onClick={() => { setEditingItem(item); setShowModal(true); }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                            disabled={deletingId === item.id}
                            onClick={() => handleDelete(item.id)}
                          >
                            {deletingId === item.id ? "..." : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--clr-text)" }}>
                    {item.title}
                  </h3>

                  {/* Body Content */}
                  <div style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.6, color: "var(--clr-text)" }}>
                    {item.content}
                  </div>

                  {/* Author Footer */}
                  <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--clr-border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.775rem", color: "var(--clr-text-muted)" }}>
                    <div>
                      Posted by <strong>{item.authorName}</strong> ({ROLE_LABELS[item.authorRole] || item.authorRole})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <NewAnnouncementModal
          announcement={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          onSuccess={() => {
            setShowModal(false);
            setEditingItem(null);
            fetchAnnouncements();
          }}
        />
      )}
    </>
  );
}
