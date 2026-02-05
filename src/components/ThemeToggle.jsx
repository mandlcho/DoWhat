import PropTypes from "prop-types";
import { THEME_OPTIONS } from "../hooks/useThemePreference";

const THEME_ICONS = { light: "☀️", dark: "🌙", system: "🌐" };

const getNextTheme = (current) => {
  const index = THEME_OPTIONS.indexOf(current);
  if (index === -1) {
    return THEME_OPTIONS[0];
  }
  return THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length];
};

function ThemeToggle({ value, onChange }) {
  const nextTheme = getNextTheme(value);

  return (
    <button
      type="button"
      className="theme-toggle-round"
      onClick={() => onChange(nextTheme)}
      aria-label={`theme: ${value}, tap for ${nextTheme}`}
      title={`theme: ${value}`}
    >
      <span aria-hidden="true">{THEME_ICONS[value]}</span>
    </button>
  );
}

ThemeToggle.propTypes = {
  value: PropTypes.oneOf(THEME_OPTIONS).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ThemeToggle;
