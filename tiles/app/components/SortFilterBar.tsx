"use client";

export interface SortOption {
  label: string;
  value: string;
}

export const DECADE_OPTIONS = [
  { label: "All Decades", value: "all" },
  { label: "2020s", value: "2020s" },
  { label: "2010s", value: "2010s" },
  { label: "2000s", value: "2000s" },
  { label: "1990s", value: "1990s" },
  { label: "1980s", value: "1980s" },
  { label: "1970s", value: "1970s" },
  { label: "1960s & earlier", value: "older" },
];

/**
 * Helper to check if a release date string (YYYY-MM-DD) matches a decade string.
 */
export function matchesDecade(releaseDate: string | null | undefined, decade: string): boolean {
  if (decade === "all") return true;
  if (!releaseDate) return false;
  const year = parseInt(releaseDate.slice(0, 4), 10);
  if (isNaN(year)) return false;

  switch (decade) {
    case "2020s":
      return year >= 2020 && year < 2030;
    case "2010s":
      return year >= 2010 && year < 2020;
    case "2000s":
      return year >= 2000 && year < 2010;
    case "1990s":
      return year >= 1990 && year < 2000;
    case "1980s":
      return year >= 1980 && year < 1990;
    case "1970s":
      return year >= 1970 && year < 1980;
    case "older":
      return year < 1970;
    default:
      return true;
  }
}

/**
 * Helper to compute decade key for sorting by decade.
 */
export function getDecadeNumber(releaseDate: string | null | undefined): number {
  if (!releaseDate) return 0;
  const year = parseInt(releaseDate.slice(0, 4), 10);
  if (isNaN(year)) return 0;
  return Math.floor(year / 10) * 10;
}

interface Props {
  sortOptions: SortOption[];
  sortBy: string;
  onSortChange: (val: string) => void;

  selectedDecade: string;
  onDecadeChange: (val: string) => void;

  availableGenres: string[];
  selectedGenre: string;
  onGenreChange: (val: string) => void;

  filteredCount: number;
  totalCount: number;
  onReset: () => void;
}

export default function SortFilterBar({
  sortOptions,
  sortBy,
  onSortChange,
  selectedDecade,
  onDecadeChange,
  availableGenres,
  selectedGenre,
  onGenreChange,
  filteredCount,
  totalCount,
  onReset,
}: Props) {
  const isFiltered =
    selectedDecade !== "all" ||
    selectedGenre !== "all" ||
    sortBy !== sortOptions[0]?.value;

  return (
    <div className="sort-filter-bar">
      {/* Sort By Dropdown */}
      <div className="sort-select-group">
        <label htmlFor="sort-select" className="sort-select-label">
          Sort:
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="sort-select"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Decade Filter Dropdown */}
      <div className="sort-select-group">
        <label htmlFor="decade-select" className="sort-select-label">
          Decade:
        </label>
        <select
          id="decade-select"
          value={selectedDecade}
          onChange={(e) => onDecadeChange(e.target.value)}
          className="sort-select"
        >
          {DECADE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Genre Filter Dropdown */}
      {availableGenres.length > 0 && (
        <div className="sort-select-group">
          <label htmlFor="genre-select" className="sort-select-label">
            Genre:
          </label>
          <select
            id="genre-select"
            value={selectedGenre}
            onChange={(e) => onGenreChange(e.target.value)}
            className="sort-select"
          >
            <option value="all">All Genres</option>
            {availableGenres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Count & Reset Filter */}
      {isFiltered && (
        <button
          type="button"
          onClick={onReset}
          className="filter-reset-btn"
          title="Reset to default sorting and clear filters"
        >
          <span>✕ Reset</span>
          <span style={{ opacity: 0.65 }}>
            ({filteredCount} of {totalCount})
          </span>
        </button>
      )}
    </div>
  );
}
