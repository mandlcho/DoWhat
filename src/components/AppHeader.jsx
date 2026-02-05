import PropTypes from "prop-types";
import ThemeToggle from "./ThemeToggle";
import { useSession } from "../hooks/useSession";
import { supabase } from "../supabaseClient";

function AppHeader({
  viewMode,
  onViewModeChange,
  themeMode,
  onThemeModeChange,
}) {
  const { session } = useSession();

  return (
    <header className="app-header">
      <div className="app-header-top">
        <h1>tasks</h1>
        <div className="header-controls">
          {session && <p>{session.user.email}</p>}
          <button className="button" onClick={() => supabase.auth.signOut()}>
            Logout
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
