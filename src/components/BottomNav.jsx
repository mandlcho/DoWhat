import { useState } from "react";
import PropTypes from "prop-types";
import { useVault } from "../hooks/useVault";

function BottomNav({
  filter,
  onFilterChange,
  columns,
  viewMode,
  onViewModeChange,
  stats,
  onArchiveCompleted,
  onToggleArchive,
  isArchiveOpen,
  archivedCount,
  archiveToggleRef,
}) {
  const { vaultId } = useVault();
  const [copied, setCopied] = useState(false);

  const handleCopyVault = () => {
    if (!vaultId) return;
    navigator.clipboard.writeText(vaultId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <nav className="bottom-nav" aria-label="main navigation">
      <div
        className="bottom-nav-filters"
        role="radiogroup"
        aria-label="filter tasks"
      >
        {columns.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`bottom-nav-filter${filter === key ? " active" : ""}`}
            onClick={() => onFilterChange(key)}
            role="radio"
            aria-checked={filter === key}
            disabled={viewMode !== "list"}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bottom-nav-divider" />

      <div className="bottom-nav-views" role="group" aria-label="view mode">
        <button
          type="button"
          className={`bottom-nav-view${viewMode === "list" ? " active" : ""}`}
          onClick={() => onViewModeChange("list")}
          aria-pressed={viewMode === "list"}
        >
          list
        </button>
        <button
          type="button"
          className={`bottom-nav-view${viewMode === "card" ? " active" : ""}`}
          onClick={() => onViewModeChange("card")}
          aria-pressed={viewMode === "card"}
        >
          board
        </button>
      </div>

      <div className="bottom-nav-divider" />

      <div className="bottom-nav-actions">
        <button
          type="button"
          className="bottom-nav-action"
          onClick={handleCopyVault}
          aria-label="copy vault code"
        >
          {copied ? "copied" : "vault"}
        </button>
        <button
          type="button"
          className="bottom-nav-action"
          onClick={onArchiveCompleted}
          disabled={stats.completed === 0}
        >
          clear
        </button>
        <button
          type="button"
          className="bottom-nav-action"
          onClick={onToggleArchive}
          ref={archiveToggleRef}
          disabled={archivedCount === 0}
          aria-expanded={isArchiveOpen}
        >
          {isArchiveOpen ? "hide" : `archive (${archivedCount})`}
        </button>
      </div>
    </nav>
  );
}

BottomNav.propTypes = {
  filter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  viewMode: PropTypes.oneOf(["list", "card"]).isRequired,
  onViewModeChange: PropTypes.func.isRequired,
  stats: PropTypes.shape({
    completed: PropTypes.number.isRequired,
  }).isRequired,
  onArchiveCompleted: PropTypes.func.isRequired,
  onToggleArchive: PropTypes.func.isRequired,
  isArchiveOpen: PropTypes.bool.isRequired,
  archivedCount: PropTypes.number.isRequired,
  archiveToggleRef: PropTypes.shape({ current: PropTypes.any }),
};

export default BottomNav;
