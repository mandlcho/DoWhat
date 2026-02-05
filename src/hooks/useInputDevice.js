import { useEffect } from "react";

/**
 * Detects whether the primary input is touch or mouse/keyboard and sets
 * `data-input="touch"` or `data-input="mouse"` on <html>.
 *
 * Detection strategy (order matters):
 *   1. On first touchstart  → switch to "touch"
 *   2. On first mousemove with movementX|Y > 0 → switch to "mouse"
 *        (filters out synthetic mousemove events that browsers fire after touch)
 *   3. Initial guess uses `(hover: hover)` media query — true on real mice,
 *        false on pure-touch devices.
 *
 * The attribute flips dynamically if the user plugs in / unplugs a mouse.
 */
export function useInputDevice() {
  useEffect(() => {
    const root = document.documentElement;

    const setInput = (type) => {
      root.setAttribute("data-input", type);
    };

    if (typeof window.matchMedia === "function") {
      setInput(window.matchMedia("(hover: hover)").matches ? "mouse" : "touch");
    }

    const onTouch = () => setInput("touch");

    const onMouse = (e) => {
      // Ignore synthetic mousemoves that browsers fire right after a touch
      if (e.movementX === 0 && e.movementY === 0) return;
      setInput("mouse");
    };

    document.addEventListener("touchstart", onTouch, { passive: true });
    document.addEventListener("mousemove", onMouse);

    return () => {
      document.removeEventListener("touchstart", onTouch);
      document.removeEventListener("mousemove", onMouse);
    };
  }, []);
}
