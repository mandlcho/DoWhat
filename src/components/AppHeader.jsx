import { useState } from "react";
import PropTypes from "prop-types";
import ThemeToggle from "./ThemeToggle";
import { useVault } from "../hooks/useVault";

function AppHeader({
  viewMode,
  onViewModeChange,
  themeMode,
  onThemeModeChange,
}) {
  const { vaultId, leaveVault } = useVault();
  const [copied, setCopied] = useState(false);

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
        <h1>tasks</h1>
        <div className="header-controls">
          {vaultId && (
            <button
              type="button"
              className="theme-toggle-button vault-copy-button"
              onClick={handleCopyVault}
              aria-label="copy vault code"
            >
              {copied ? "copied" : "vault"}
            </button>
          )}
          <button className="button" onClick={leaveVault}>
            leave
          </button>
          <ThemeToggle value={themeMode} onChange={onThemeModeChange} />
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
