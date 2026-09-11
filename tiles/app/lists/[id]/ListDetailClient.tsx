"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MediaCard, { MediaSummary } from "@/app/components/MediaCard";
import SortFilterBar, {
  SortOption,
  matchesDecade,
  getDecadeNumber,
} from "@/app/components/SortFilterBar";

const BACKEND = "/api/backend";

export interface UserListItem {
  added_at: string;
  media: MediaSummary;
}

export interface UserListDetail {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  items: UserListItem[];
}

const LIST_SORT_OPTIONS: SortOption[] = [
  { label: "Recently Added", value: "added_desc" },
  { label: "Release Date (Newest)", value: "release_desc" },
  { label: "Release Date (Oldest)", value: "release_asc" },
  { label: "Decade (Newest)", value: "decade_desc" },
  { label: "Decade (Oldest)", value: "decade_asc" },
];

export default function ListDetailClient({ initialDetail }: { initialDetail: UserListDetail | null }) {
  const router = useRouter();

  if (!initialDetail) {
    return (
      <div style={{ maxWidth: 1000, margin: "4rem auto", textAlign: "center", padding: "2rem" }}>
        <p className="empty-title">Folder Not Found</p>
        <p className="empty-sub">This list does not exist or you do not have permission to view it.</p>
        <Link href="/lists" className="pill-btn-solid" style={{ display: "inline-block", marginTop: "1rem" }}>
          Back to Lists
        </Link>
      </div>
    );
  }

  const [detail, setDetail] = useState<UserListDetail>(initialDetail);
  const [items, setItems] = useState<UserListItem[]>(initialDetail.items || []);
  const [sortBy, setSortBy] = useState<string>("added_desc");
  const [selectedDecade, setSelectedDecade] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(detail.title);
  const [editDesc, setEditDesc] = useState(detail.description || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleRemoveItem = async (mediaId: number) => {
    setItems((prev) => prev.filter((i) => i.media.id !== mediaId));
    try {
      await fetch(`${BACKEND}/lists/${detail.id}/items/${mediaId}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (e) {
      console.error("Failed to remove item from list:", e);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = editTitle.trim();
    if (!title || isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch(`${BACKEND}/lists/${detail.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description: editDesc.trim() || null,
        }),
      });

      if (res.ok) {
        setDetail((prev) => ({
          ...prev,
          title,
          description: editDesc.trim() || null,
          updated_at: new Date().toISOString(),
        }));
        setIsEditing(false);
      } else {
        alert("Failed to update list metadata");
      }
    } catch (err) {
      console.error("Error updating list:", err);
      alert("Network error updating list");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteList = async () => {
    if (!confirm(`Are you sure you want to delete "${detail.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${BACKEND}/lists/${detail.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        router.push("/lists");
      } else {
        alert("Failed to delete list");
      }
    } catch (err) {
      console.error("Error deleting list:", err);
      alert("Network error deleting list");
    }
  };

  // Collect unique genres present in list
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      item.media.genres?.forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [items]);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    const filtered = items.filter((item) => {
      if (!matchesDecade(item.media.release_date, selectedDecade)) return false;
      if (selectedGenre !== "all" && !item.media.genres?.includes(selectedGenre)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "release_desc": {
          const tA = a.media.release_date ? new Date(a.media.release_date).getTime() : 0;
          const tB = b.media.release_date ? new Date(b.media.release_date).getTime() : 0;
          return tB - tA;
        }
        case "release_asc": {
          const tA = a.media.release_date ? new Date(a.media.release_date).getTime() : 9999999999999;
          const tB = b.media.release_date ? new Date(b.media.release_date).getTime() : 9999999999999;
          return tA - tB;
        }
        case "decade_desc": {
          const dA = getDecadeNumber(a.media.release_date);
          const dB = getDecadeNumber(b.media.release_date);
          if (dA !== dB) return dB - dA;
          const tA = a.media.release_date ? new Date(a.media.release_date).getTime() : 0;
          const tB = b.media.release_date ? new Date(b.media.release_date).getTime() : 0;
          return tB - tA;
        }
        case "decade_asc": {
          const dA = getDecadeNumber(a.media.release_date);
          const dB = getDecadeNumber(b.media.release_date);
          if (dA !== dB) return dA - dB;
          const tA = a.media.release_date ? new Date(a.media.release_date).getTime() : 9999999999999;
          const tB = b.media.release_date ? new Date(b.media.release_date).getTime() : 9999999999999;
          return tA - tB;
        }
        case "added_asc":
          return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        case "added_desc":
        default:
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
      }
    });
  }, [items, selectedDecade, selectedGenre, sortBy]);

  const handleResetFilters = () => {
    setSortBy("added_desc");
    setSelectedDecade("all");
    setSelectedGenre("all");
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "1.5rem 2rem 5rem" }}>
      {/* Breadcrumb back to /lists */}
      <div style={{ marginBottom: "1.25rem" }}>
        <Link
          href="/lists"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--text-muted)",
            fontSize: "0.8125rem",
            textDecoration: "none",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cream-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>All Lists</span>
        </Link>
      </div>

      {/* Header Container */}
      <div
        style={{
          background: "rgba(242, 237, 227, 0.03)",
          border: "1px solid rgba(242, 237, 227, 0.1)",
          borderRadius: "1.25rem",
          padding: "1.75rem 2rem",
          marginBottom: "2rem",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        }}
      >
        {isEditing ? (
          /* Inline Edit Mode */
          <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                  marginBottom: "0.35rem",
                }}
              >
                Folder Title
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  padding: "0.6rem 0.85rem",
                  background: "rgba(242, 237, 227, 0.06)",
                  border: "1px solid rgba(242, 237, 227, 0.2)",
                  borderRadius: "0.5rem",
                  color: "var(--cream-primary)",
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                  marginBottom: "0.35rem",
                }}
              >
                Description
              </label>
              <textarea
                rows={2}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Add notes about this collection…"
                style={{
                  width: "100%",
                  maxWidth: "600px",
                  padding: "0.6rem 0.85rem",
                  background: "rgba(242, 237, 227, 0.06)",
                  border: "1px solid rgba(242, 237, 227, 0.2)",
                  borderRadius: "0.5rem",
                  color: "var(--cream-primary)",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  outline: "none",
                  resize: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.625rem", marginTop: "0.5rem" }}>
              <button
                type="submit"
                disabled={isSaving || !editTitle.trim()}
                className="pill-btn-solid"
                style={{ padding: "0.45rem 1.25rem", fontSize: "0.8125rem", cursor: "pointer" }}
              >
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditTitle(detail.title);
                  setEditDesc(detail.description || "");
                  setIsEditing(false);
                }}
                className="pill-btn-ghost"
                style={{ padding: "0.45rem 1rem", fontSize: "0.8125rem", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* View Mode */
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "260px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                <h1
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: "var(--cream-primary)",
                    margin: 0,
                  }}
                >
                  {detail.title}
                </h1>
                <span className="pill-badge" style={{ fontSize: "0.8125rem", padding: "0.2rem 0.75rem" }}>
                  {items.length} {items.length === 1 ? "title" : "titles"}
                </span>
              </div>

              {detail.description && (
                <p
                  style={{
                    fontSize: "0.9375rem",
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                    maxWidth: "700px",
                    margin: "0 0 0.75rem",
                  }}
                >
                  {detail.description}
                </p>
              )}

              <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", margin: 0 }}>
                Created {new Date(detail.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>

            {/* Folder Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="pill-btn-ghost"
                style={{
                  padding: "0.45rem 1rem",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteList}
                style={{
                  padding: "0.45rem 1rem",
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  color: "#fca5a5",
                  borderRadius: "9999px",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  transition: "all 0.15s ease",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.16)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.25)";
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Delete List</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      {items.length === 0 ? (
        <div className="empty-state">
          <div
            style={{
              width: 52,
              height: 52,
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
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="17" x2="22" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
          </div>
          <p className="empty-title">This folder is empty</p>
          <p className="empty-sub">
            Visit any movie or show page and click "+ List" to organize items into "{detail.title}".
          </p>
          <Link href="/discover" className="pill-btn-solid" style={{ marginTop: "1rem", display: "inline-block" }}>
            Explore Discover
          </Link>
        </div>
      ) : (
        <>
          {/* Sort & Filter Controls */}
          <SortFilterBar
            sortOptions={LIST_SORT_OPTIONS}
            sortBy={sortBy}
            onSortChange={setSortBy}
            selectedDecade={selectedDecade}
            onDecadeChange={setSelectedDecade}
            availableGenres={availableGenres}
            selectedGenre={selectedGenre}
            onGenreChange={setSelectedGenre}
            filteredCount={filteredAndSorted.length}
            totalCount={items.length}
            onReset={handleResetFilters}
          />

          {filteredAndSorted.length === 0 ? (
            <div className="empty-state" style={{ padding: "3rem 1rem" }}>
              <p className="empty-title">No matching titles</p>
              <p className="empty-sub">Try adjusting your decade or genre filter.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="pill-btn-ghost"
                style={{ marginTop: "0.75rem", padding: "0.4rem 1.25rem", cursor: "pointer" }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="media-grid" role="list" aria-label="Folder items">
              {filteredAndSorted.map(({ media }) => (
                <div key={media.id} style={{ position: "relative" }}>
                  <MediaCard item={media} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveItem(media.id);
                    }}
                    title="Remove from list"
                    aria-label={`Remove ${media.title} from list`}
                    style={{
                      position: "absolute",
                      top: "0.4rem",
                      right: "0.4rem",
                      zIndex: 10,
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "rgba(10, 10, 9, 0.75)",
                      border: "1px solid rgba(242, 237, 227, 0.2)",
                      backdropFilter: "blur(4px)",
                      color: "var(--cream-primary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.85)";
                      e.currentTarget.style.borderColor = "rgba(239, 68, 68, 1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(10, 10, 9, 0.75)";
                      e.currentTarget.style.borderColor = "rgba(242, 237, 227, 0.2)";
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
