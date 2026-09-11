"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BACKEND = "/api/backend";
const TMDB_IMG_W185 = "https://image.tmdb.org/t/p/w185";

export interface UserListSummary {
  id: number;
  title: string;
  description: string | null;
  item_count: number;
  preview_posters: string[];
  created_at: string;
  updated_at: string;
}

export default function ListsClient({ initialLists }: { initialLists: UserListSummary[] }) {
  const router = useRouter();
  const [lists, setLists] = useState<UserListSummary[]>(initialLists);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description: newDescription.trim() || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create list");
      }

      const created = await res.json();
      const newList: UserListSummary = {
        id: created.id,
        title: created.title,
        description: newDescription.trim() || null,
        item_count: 0,
        preview_posters: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setLists((prev) => [newList, ...prev]);
      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      router.push(`/lists/${created.id}`);
    } catch (err) {
      console.error("Error creating list:", err);
      setError("Failed to create folder. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteList = async (e: React.MouseEvent, listId: number, title: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete the folder "${title}"?`)) {
      return;
    }

    setDeletingId(listId);
    try {
      const res = await fetch(`${BACKEND}/lists/${listId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setLists((prev) => prev.filter((l) => l.id !== listId));
      } else {
        alert("Failed to delete list.");
      }
    } catch (err) {
      console.error("Error deleting list:", err);
      alert("Network error deleting list.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "2rem 2rem 5rem" }}>
      {/* Editorial Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--cream-primary)",
              margin: 0,
            }}
          >
            My Lists
          </h1>
          <span className="pill-badge" style={{ fontSize: "0.8125rem", padding: "0.2rem 0.75rem" }}>
            {lists.length} {lists.length === 1 ? "folder" : "folders"}
          </span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="pill-btn-solid"
          style={{
            padding: "0.55rem 1.35rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New List</span>
        </button>
      </div>

      {/* Empty State */}
      {lists.length === 0 ? (
        <div className="empty-state">
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "rgba(242, 237, 227, 0.05)",
              border: "1px solid rgba(242, 237, 227, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
            aria-hidden="true"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--cream-primary)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="empty-title">No lists yet</p>
          <p className="empty-sub">
            Curate custom collections, thematic watchlists, or director retrospectives.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="pill-btn-solid"
            style={{ marginTop: "1rem", padding: "0.5rem 1.25rem", fontSize: "0.8125rem", cursor: "pointer" }}
          >
            + Create Your First Folder
          </button>
        </div>
      ) : (
        /* Folders Grid */
        <div className="folders-grid">
          {lists.map((list) => {
            const posters = list.preview_posters || [];
            return (
              <Link key={list.id} href={`/lists/${list.id}`} className="folder-card">
                {/* 2x2 Poster Collage */}
                <div className="folder-collage">
                  {posters.length > 0 ? (
                    Array.from({ length: 4 }).map((_, idx) => {
                      const posterPath = posters[idx % posters.length];
                      return (
                        <div key={idx} className="folder-collage-thumb">
                          {posterPath ? (
                            <Image
                              src={`${TMDB_IMG_W185}${posterPath}`}
                              alt=""
                              fill
                              sizes="150px"
                              style={{ objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                background: "#171715",
                              }}
                            />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="folder-collage-empty">
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      >
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Folder Info */}
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 0.35rem",
                        fontSize: "1.0625rem",
                        fontWeight: 700,
                        color: "var(--cream-primary)",
                        letterSpacing: "-0.01em",
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={list.title}
                    >
                      {list.title}
                    </h3>

                    {/* Quick Delete */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteList(e, list.id, list.title)}
                      disabled={deletingId === list.id}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-faint)",
                        cursor: "pointer",
                        padding: "0.2rem",
                        lineHeight: 1,
                        fontSize: "0.8125rem",
                        transition: "color 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
                      title="Delete folder"
                    >
                      {deletingId === list.id ? "…" : "✕"}
                    </button>
                  </div>

                  {list.description && (
                    <p
                      style={{
                        margin: "0 0 0.85rem",
                        fontSize: "0.8125rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {list.description}
                    </p>
                  )}

                  {/* Meta Footer */}
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "0.625rem",
                      borderTop: "1px solid rgba(242, 237, 227, 0.06)",
                    }}
                  >
                    <span className="folder-badge">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="2" width="20" height="20" rx="2" />
                      </svg>
                      {list.item_count} {list.item_count === 1 ? "title" : "titles"}
                    </span>

                    <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
                      {new Date(list.updated_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create List Modal */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-create-list-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "rgba(10, 10, 9, 0.8)",
            backdropFilter: "blur(8px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
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
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h2
                  id="modal-create-list-title"
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--cream-primary)",
                    margin: 0,
                  }}
                >
                  Create New List
                </h2>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
                  Create a custom folder to organize movies & shows.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
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

            <form onSubmit={handleCreateList} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    marginBottom: "0.4rem",
                  }}
                >
                  Folder Title <span style={{ color: "#f87171" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 90s Cyberpunk, Spooky Season"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    background: "rgba(242, 237, 227, 0.04)",
                    border: "1px solid rgba(242, 237, 227, 0.15)",
                    borderRadius: "0.625rem",
                    color: "var(--cream-primary)",
                    fontSize: "0.875rem",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    marginBottom: "0.4rem",
                  }}
                >
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="What is this collection about?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    background: "rgba(242, 237, 227, 0.04)",
                    border: "1px solid rgba(242, 237, 227, 0.15)",
                    borderRadius: "0.625rem",
                    color: "var(--cream-primary)",
                    fontSize: "0.875rem",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "0.55rem 1.125rem",
                    background: "transparent",
                    border: "1px solid rgba(242, 237, 227, 0.15)",
                    borderRadius: "9999px",
                    color: "var(--text-muted)",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || isSubmitting}
                  className="pill-btn-solid"
                  style={{
                    padding: "0.55rem 1.35rem",
                    fontSize: "0.8125rem",
                    cursor: newTitle.trim() && !isSubmitting ? "pointer" : "default",
                    opacity: newTitle.trim() && !isSubmitting ? 1 : 0.6,
                  }}
                >
                  {isSubmitting ? "Creating…" : "Create List"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
