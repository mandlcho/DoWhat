import { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import ThemeToggle from "./ThemeToggle";
import { useVault } from "../hooks/useVault";

const STORAGE_KEY_TITLE = "doWhat_vault_title";

function AppHeader({
  viewMode,
  onViewModeChange,
  themeMode,
  onThemeModeChange,
}) {
  const { vaultId, leaveVault } = useVault();
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState(
    () => localStorage.getItem(STORAGE_KEY_TITLE) || "tasks",
  );
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitTitle = useCallback(() => {
    const val = title.trim() || "tasks";
    setTitle(val);
    localStorage.setItem(STORAGE_KEY_TITLE, val);
    setEditing(false);
  }, [title]);

  const handleCopyVault = () => {
    if (!vaultId) return;
    navigator.clipboard.writeText(vaultId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <header className="app-header">
      <div className="app-header-top">
        {editing ? (
          <input
            ref={inputRef}
            className="header-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setTitle(localStorage.getItem(STORAGE_KEY_TITLE) || "tasks");
                setEditing(false);
              }
            }}
            autoComplete="off"
            spellCheck={false}
          />
        ) : (
          <h1
            className="header-title-editable"
            onClick={() => setEditing(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setEditing(true);
            }}
            role="button"
            tabIndex={0}
            aria-label={`rename: ${title}`}
          >
            {title}
          </h1>
        )}
        <div className="header-controls">
          {vaultId && (
            <button
              type="button"
              className="header-btn-ghost"
              onClick={handleCopyVault}
              aria-label="copy vault code"
            >
              {copied ? "copied" : "vault"}
            </button>
          )}
          <ThemeToggle value={themeMode} onChange={onThemeModeChange} />
          <button
            type="button"
            className="header-btn-leave"
            onClick={leaveVault}
            aria-label="leave vault"
          >
            ×
          </button>
          <div className="view-toggles" role="group" aria-label="view mode">
            <button
              type="button"
              className={
                viewMode === "list" ? "view-option active" : "view-option"
              }
              onClick={() => onViewModeChange("list")}
              aria-pressed={viewMode === "list"}
            >
              list
            </button>
            <button
              type="button"
              className={
                viewMode === "card" ? "view-option active" : "view-option"
              }
              onClick={() => onViewModeChange("card")}
              aria-pressed={viewMode === "card"}
            >
              board
            </button>
          </div>
        </div>
      </div>
      <p>simple task app</p>
    </header>
  );
}

AppHeader.propTypes = {
  viewMode: PropTypes.oneOf(["list", "card"]).isRequired,
  onViewModeChange: PropTypes.func.isRequired,
  themeMode: PropTypes.oneOf(["light", "dark", "system"]).isRequired,
  onThemeModeChange: PropTypes.func.isRequired,
};

export default AppHeader;
