import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { ROLE_LABELS, type Conversation, type Message } from "@/types";
import NewMessageModal from "./NewMessageModal";

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [prefilledRecipientId, setPrefilledRecipientId] = useState<string | undefined>();
  const [prefilledSubject, setPrefilledSubject] = useState<string | undefined>();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check URL params for direct link to message a user (e.g. /messages?to=USER_ID&subject=...)
  useEffect(() => {
    const toParam = searchParams.get("to");
    const subjectParam = searchParams.get("subject");
    if (toParam) {
      setPrefilledRecipientId(toParam);
      if (subjectParam) setPrefilledSubject(subjectParam);
      setShowNewModal(true);
    }
  }, [searchParams]);

  // Load conversations list
  const loadConversations = async (autoSelectId?: string) => {
    try {
      setLoadingList(true);
      const data = await api.messages.conversations();
      setConversations(data || []);

      if (autoSelectId) {
        setActiveConvId(autoSelectId);
      } else if (!activeConvId && data && data.length > 0) {
        setActiveConvId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Load active chat messages whenever activeConvId changes
  useEffect(() => {
    if (!activeConvId) return;

    let isSubscribed = true;
    const loadChat = async () => {
      try {
        setLoadingChat(true);
        const res = await api.messages.getConversation(activeConvId);
        if (isSubscribed) {
          setActiveMessages(res.messages || []);
          // update unread count locally for this conversation
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        console.error("Failed to load conversation details:", err);
      } finally {
        if (isSubscribed) setLoadingChat(false);
      }
    };

    loadChat();
    return () => {
      isSubscribed = false;
    };
  }, [activeConvId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConvId || !replyContent.trim() || sendingReply) return;

    try {
      setSendingReply(true);
      const newMsg = await api.messages.reply(activeConvId, { content: replyContent.trim() });
      setActiveMessages((prev) => [...prev, newMsg]);
      setReplyContent("");

      // Update preview in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                lastMessage: newMsg.content,
                lastMessageAt: newMsg.createdAt,
                lastSenderId: newMsg.senderId,
              }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to send reply:", err);
      alert("Failed to send reply. Please try again.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  const filteredConversations = conversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const other = c.otherParticipant;
    const name = other ? `${other.firstName} ${other.lastName}`.toLowerCase() : "";
    const subj = (c.subject || "").toLowerCase();
    const lastMsg = (c.lastMessage || "").toLowerCase();
    return name.includes(q) || subj.includes(q) || lastMsg.includes(q);
  });

  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case "teacher":
        return { background: "rgba(37, 99, 235, 0.15)", color: "#60a5fa", border: "1px solid rgba(37, 99, 235, 0.3)" };
      case "guardian":
        return { background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" };
      case "student":
        return { background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)" };
      case "super_admin":
      case "registrar":
        return { background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.3)" };
      default:
        return { background: "rgba(100, 116, 139, 0.15)", color: "#94a3b8", border: "1px solid rgba(100, 116, 139, 0.3)" };
    }
  };

  return (
    <div style={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--clr-primary)" }}>💬</span> Direct Communications
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            Official teacher-to-parent and learner communication channel for DepEd scholastic coordination
          </p>
        </div>

        <button
          onClick={() => {
            setPrefilledRecipientId(undefined);
            setPrefilledSubject(undefined);
            setShowNewModal(true);
          }}
          className="btn-primary"
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "var(--radius)",
            background: "var(--clr-primary)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            border: "none",
            boxShadow: "0 2px 8px var(--clr-primary-glow)",
          }}
        >
          <span>＋</span> New Message
        </button>
      </div>

      {/* Main Split Chat View */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          background: "var(--clr-surface)",
          border: "1px solid var(--clr-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow)",
        }}
      >
        {/* Left Side: Inbox List */}
        <div
          style={{
            borderRight: "1px solid var(--clr-border)",
            display: "flex",
            flexDirection: "column",
            background: "var(--clr-surface)",
          }}
        >
          {/* Inbox Search */}
          <div style={{ padding: "0.85rem", borderBottom: "1px solid var(--clr-border)" }}>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                background: "var(--clr-surface-2)",
                border: "1px solid var(--clr-border)",
                color: "var(--clr-text)",
                fontSize: "0.85rem",
              }}
            />
          </div>

          {/* Conversation List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loadingList ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--clr-text-muted)" }}>
                <div className="spinner" style={{ margin: "0 auto 0.75rem" }} />
                <span>Loading messages...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: "2rem 1.5rem", textAlign: "center", color: "var(--clr-text-muted)" }}>
                <p style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>📭</p>
                <strong style={{ display: "block", color: "var(--clr-text)", marginBottom: "0.25rem" }}>
                  No messages yet
                </strong>
                <p style={{ fontSize: "0.8rem", margin: 0 }}>
                  Start a direct conversation with a teacher, student, or guardian.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                const other = conv.otherParticipant;
                const otherName = other ? `${other.firstName} ${other.lastName}` : "Direct Contact";
                const initials = other ? `${other.firstName[0]}${other.lastName[0]}`.toUpperCase() : "D";
                const hasUnread = (conv.unreadCount || 0) > 0;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    style={{
                      padding: "0.85rem 1rem",
                      borderBottom: "1px solid var(--clr-border-soft)",
                      cursor: "pointer",
                      background: isActive ? "var(--clr-surface-2)" : "transparent",
                      borderLeft: isActive ? "3px solid var(--clr-primary)" : "3px solid transparent",
                      transition: "all 0.15s ease",
                      display: "flex",
                      gap: "0.75rem",
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Contact Avatar */}
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "50%",
                        background: isActive ? "var(--clr-primary)" : "var(--clr-surface-2)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        flexShrink: 0,
                        border: "1px solid var(--clr-border)",
                      }}
                    >
                      {initials}
                    </div>

                    {/* Metadata */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.15rem" }}>
                        <strong
                          style={{
                            fontSize: "0.9rem",
                            color: hasUnread ? "#0f172a" : "var(--clr-text)",
                            fontWeight: hasUnread ? 700 : 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {otherName}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", flexShrink: 0, marginLeft: "0.5rem" }}>
                          {formatTimestamp(conv.lastMessageAt || conv.updatedAt)}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.25rem" }}>
                        {other?.role && (
                          <span
                            style={{
                              ...getRoleBadgeStyle(other.role),
                              fontSize: "0.68rem",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "10px",
                              fontWeight: 600,
                            }}
                          >
                            {ROLE_LABELS[other.role] || other.role}
                          </span>
                        )}
                        {conv.subject && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--clr-text-muted)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                          >
                            • {conv.subject}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.8rem",
                            color: hasUnread ? "var(--clr-text)" : "var(--clr-text-muted)",
                            fontWeight: hasUnread ? 600 : 400,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                          }}
                        >
                          {conv.lastSenderId === user?.id ? "You: " : ""}
                          {conv.lastMessage || "Started a conversation"}
                        </p>
                        {hasUnread && (
                          <span
                            style={{
                              background: "var(--clr-primary)",
                              color: "#fff",
                              borderRadius: "10px",
                              padding: "0.1rem 0.45rem",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              marginLeft: "0.5rem",
                            }}
                          >
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Chat View */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--clr-bg)" }}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div
                style={{
                  padding: "0.85rem 1.25rem",
                  borderBottom: "1px solid var(--clr-border)",
                  background: "var(--clr-surface)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "var(--clr-primary)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                    }}
                  >
                    {activeConversation.otherParticipant
                      ? `${activeConversation.otherParticipant.firstName[0]}${activeConversation.otherParticipant.lastName[0]}`.toUpperCase()
                      : "D"}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <strong style={{ fontSize: "1rem", color: "var(--clr-text)" }}>
                        {activeConversation.otherParticipant
                          ? `${activeConversation.otherParticipant.firstName} ${activeConversation.otherParticipant.lastName}`
                          : "Contact"}
                      </strong>
                      {activeConversation.otherParticipant?.role && (
                        <span
                          style={{
                            ...getRoleBadgeStyle(activeConversation.otherParticipant.role),
                            fontSize: "0.7rem",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "10px",
                            fontWeight: 600,
                          }}
                        >
                          {ROLE_LABELS[activeConversation.otherParticipant.role] || activeConversation.otherParticipant.role}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.1rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>
                        {activeConversation.otherParticipant?.email}
                      </span>
                      {activeConversation.subject && (
                        <span style={{ fontSize: "0.75rem", color: "var(--clr-accent)", fontWeight: 500 }}>
                          • Re: {activeConversation.subject}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => loadConversations(activeConvId || undefined)}
                  title="Refresh messages"
                  style={{
                    background: "var(--clr-surface-2)",
                    border: "1px solid var(--clr-border)",
                    color: "var(--clr-text-muted)",
                    padding: "0.45rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  ↻ Refresh
                </button>
              </div>

              {/* Chat Message Feed */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                }}
              >
                {loadingChat ? (
                  <div style={{ margin: "auto", textAlign: "center", color: "var(--clr-text-muted)" }}>
                    <div className="spinner" style={{ margin: "0 auto 0.5rem" }} />
                    <span style={{ fontSize: "0.85rem" }}>Loading conversation history...</span>
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div style={{ margin: "auto", textAlign: "center", color: "var(--clr-text-muted)", maxWidth: "380px" }}>
                    <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💬</p>
                    <strong style={{ color: "var(--clr-text)" }}>This is the start of your message history</strong>
                    <p style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      Send a message below to coordinate on grades, attendance, or student advisory matters.
                    </p>
                  </div>
                ) : (
                  activeMessages.map((msg) => {
                    const isMine = msg.senderId === user?.id;

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isMine ? "flex-end" : "flex-start",
                          maxWidth: "75%",
                          alignSelf: isMine ? "flex-end" : "flex-start",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginBottom: "0.25rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", fontWeight: 500 }}>
                            {isMine ? "You" : msg.senderName}
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "var(--clr-text-faint)" }}>
                            {formatTimestamp(msg.createdAt)}
                          </span>
                        </div>

                        <div
                          style={{
                            padding: "0.75rem 1rem",
                            borderRadius: isMine ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                            background: isMine ? "var(--clr-primary)" : "var(--clr-surface-2)",
                            color: isMine ? "#ffffff" : "var(--clr-text)",
                            border: isMine ? "none" : "1px solid var(--clr-border)",
                            boxShadow: isMine ? "0 2px 6px var(--clr-primary-glow)" : "var(--shadow-sm)",
                            fontSize: "0.875rem",
                            lineHeight: "1.45",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Composer */}
              <div
                style={{
                  padding: "0.85rem 1.25rem",
                  borderTop: "1px solid var(--clr-border)",
                  background: "var(--clr-surface)",
                }}
              >
                <form onSubmit={handleSendReply} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <textarea
                      rows={2}
                      placeholder="Type a message (Enter to send, Shift+Enter for newline)..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sendingReply}
                      style={{
                        width: "100%",
                        padding: "0.65rem 0.85rem",
                        borderRadius: "var(--radius)",
                        background: "var(--clr-surface-2)",
                        border: "1px solid var(--clr-border)",
                        color: "var(--clr-text)",
                        fontSize: "0.875rem",
                        resize: "none",
                        fontFamily: "inherit",
                        lineHeight: "1.4",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!replyContent.trim() || sendingReply}
                    style={{
                      padding: "0.65rem 1.25rem",
                      borderRadius: "var(--radius)",
                      background: "var(--clr-primary)",
                      color: "#fff",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      cursor: !replyContent.trim() || sendingReply ? "not-allowed" : "pointer",
                      opacity: !replyContent.trim() || sendingReply ? 0.6 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      height: "44px",
                    }}
                  >
                    {sendingReply ? "Sending..." : "Send ➤"}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty state when no conversation is selected */
            <div
              style={{
                margin: "auto",
                textAlign: "center",
                padding: "2rem",
                maxWidth: "460px",
                color: "var(--clr-text-muted)",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "var(--clr-surface-2)",
                  border: "1px solid var(--clr-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                  margin: "0 auto 1.25rem",
                }}
              >
                💬
              </div>
              <h3 style={{ color: "var(--clr-text)", fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Select a conversation
              </h3>
              <p style={{ fontSize: "0.875rem", lineHeight: "1.5", marginBottom: "1.5rem" }}>
                Choose an ongoing discussion from your inbox or compose a new direct message to consult with faculty, advisers, students, or parents.
              </p>
              <button
                onClick={() => {
                  setPrefilledRecipientId(undefined);
                  setPrefilledSubject(undefined);
                  setShowNewModal(true);
                }}
                className="btn-primary"
                style={{
                  padding: "0.6rem 1.25rem",
                  borderRadius: "var(--radius)",
                  background: "var(--clr-primary)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ✉ Compose New Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      <NewMessageModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={(newConvId) => {
          loadConversations(newConvId);
        }}
        initialRecipientId={prefilledRecipientId}
        initialSubject={prefilledSubject}
      />
    </div>
  );
}
