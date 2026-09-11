"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const BACKEND = "/api/backend";

export interface MediaListStatus {
  id: number;
  title: string;
  in_list: boolean;
}

interface AddToListModalProps {
  mediaId: number;
  mediaTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onListsChanged?: () => void;
}

/**
 * AddToListModal — Film-Noir Darkroom Modal
 * Allows adding/removing a media item to/from custom lists (folders),
 * and creating new lists inline.
 */
export default function AddToListModal({
  mediaId,
  mediaTitle,
  isOpen,
  onClose,
  onListsChanged,
}: AddToListModalProps) {
  const [lists, setLists] = useState<MediaListStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/media/${mediaId}/lists`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      } else {
        setError("Unable to load lists");
      }
    } catch (e) {
      console.error("Error loading media list status:", e);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    if (isOpen) {
      fetchLists();
    }
  }, [isOpen, fetchLists]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggle = async (list: MediaListStatus) => {
    const nextState = !list.in_list;
    // Optimistic UI update
    setLists((prev) =>
      prev.map((item) => (item.id === list.id ? { ...item, in_list: nextState } : item))
    );

    try {
      if (nextState) {
        // Add to list
        const res = await fetch(`${BACKEND}/lists/${list.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ media_item_id: mediaId }),
        });
        if (!res.ok) throw new Error("Failed to add to list");
      } else {
        // Remove from list
        const res = await fetch(`${BACKEND}/lists/${list.id}/items/${mediaId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to remove from list");
      }
      onListsChanged?.();
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setLists((prev) =>
        prev.map((item) => (item.id === list.id ? { ...item, in_list: !nextState } : item))
      );
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      // 1. Create list
      const createRes = await fetch(`${BACKEND}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: trimmed }),
      });

      if (!createRes.ok) {
        throw new Error("Failed to create list");
      }

      const createdList = await createRes.json();

      // 2. Automatically add media item to this newly created list
      await fetch(`${BACKEND}/lists/${createdList.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ media_item_id: mediaId }),
      });

      // Update local state
      setLists((prev) => [
        ...prev,
        { id: createdList.id, title: createdList.title, in_list: true },
      ]);
      setNewTitle("");
      onListsChanged?.();
    } catch (err) {
      console.error(err);
      setError("Failed to create folder");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-add-to-list-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(10, 10, 9, 0.78)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#121210",
          border: "1px solid rgba(242, 237, 227, 0.16)",
          borderRadius: "1.25rem",
          width: "100%",
          maxWidth: "460px",
          padding: "1.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          color: "var(--cream-primary)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.6875rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
                marginBottom: "0.25rem",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>Organize Collection</span>
            </div>
            <h2
              id="modal-add-to-list-title"
              style={{
                fontSize: "1.1875rem",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--cream-primary)",
                margin: 0,
              }}
            >
              Add to Folder / List
            </h2>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
                margin: "0.25rem 0 0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "340px",
              }}
              title={mediaTitle}
            >
              {mediaTitle}
            </p>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: "rgba(242, 237, 227, 0.06)",
              border: "1px solid rgba(242, 237, 227, 0.12)",
              color: "var(--text-muted)",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--cream-primary)";
              e.currentTarget.style.background = "rgba(242, 237, 227, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.background = "rgba(242, 237, 227, 0.06)";
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.625rem 0.875rem",
              borderRadius: "0.5rem",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#fca5a5",
              fontSize: "0.8125rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Existing Lists List */}
        <div
          style={{
            maxHeight: "220px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
            paddingRight: "0.25rem",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem 1rem",
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}
            >
              Loading folders…
            </div>
          ) : lists.length === 0 ? (
            <div
              style={{
                padding: "1.5rem 1rem",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.8125rem",
                background: "rgba(242, 237, 227, 0.02)",
                borderRadius: "0.75rem",
                border: "1px dashed rgba(242, 237, 227, 0.1)",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ margin: "0 auto 0.5rem", opacity: 0.6 }}
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <p style={{ margin: 0 }}>No lists created yet.</p>
              <p style={{ margin: "0.25rem 0 0", color: "var(--text-faint)" }}>
                Type a name below to create your first folder!
              </p>
            </div>
          ) : (
            lists.map((list) => (
              <label
                key={list.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "0.625rem",
                  background: list.in_list ? "rgba(242, 237, 227, 0.07)" : "rgba(242, 237, 227, 0.02)",
                  border: `1px solid ${list.in_list ? "rgba(242, 237, 227, 0.2)" : "rgba(242, 237, 227, 0.06)"}`,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(242, 237, 227, 0.09)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = list.in_list
                    ? "rgba(242, 237, 227, 0.07)"
                    : "rgba(242, 237, 227, 0.02)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", overflow: "hidden" }}>
                  {/* Custom Checkbox */}
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "4px",
                      border: `1.5px solid ${list.in_list ? "var(--cream-primary)" : "rgba(242, 237, 227, 0.3)"}`,
                      background: list.in_list ? "var(--cream-primary)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {list.in_list && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a09" strokeWidth="3.2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={list.in_list}
                    onChange={() => handleToggle(list)}
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                  <span
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: list.in_list ? 600 : 400,
                      color: list.in_list ? "var(--cream-primary)" : "var(--cream-soft)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {list.title}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: list.in_list ? "var(--cream-primary)" : "var(--text-faint)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  {list.in_list ? "Added" : ""}
                </span>
              </label>
            ))
          )}
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(242, 237, 227, 0.08)" }} />

        {/* Create New List Inline Form */}
        <form onSubmit={handleCreateList} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Create new folder (e.g. Noir Classics)…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={isCreating}
            style={{
              flex: 1,
              padding: "0.625rem 0.875rem",
              background: "rgba(242, 237, 227, 0.04)",
              border: "1px solid rgba(242, 237, 227, 0.15)",
              borderRadius: "9999px",
              color: "var(--cream-primary)",
              fontSize: "0.8125rem",
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--cream-primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(242, 237, 227, 0.15)")}
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || isCreating}
            style={{
              padding: "0.625rem 1.125rem",
              borderRadius: "9999px",
              background: newTitle.trim() && !isCreating ? "var(--cream-primary)" : "rgba(242, 237, 227, 0.1)",
              border: "none",
              color: newTitle.trim() && !isCreating ? "#0a0a09" : "var(--text-faint)",
              fontWeight: 600,
              fontSize: "0.8125rem",
              cursor: newTitle.trim() && !isCreating ? "pointer" : "default",
              transition: "all 0.15s ease",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontFamily: "inherit",
            }}
          >
            {isCreating ? "Creating…" : "+ Create"}
          </button>
        </form>
      </div>
    </div>
  );
}
