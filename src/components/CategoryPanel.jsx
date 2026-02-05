import { useState } from "react";
import PropTypes from "prop-types";
import { CATEGORY_DRAG_TYPE } from "../utils/dragTypes";

function CategoryPanel({
  categories,
  selected,
  onToggleCategory,
  onCreateCategory,
  onRemoveCategory,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [error, setError] = useState("");
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState(null);

  const handleToggle = (categoryId) => {
    onToggleCategory(categoryId);
  };

  const handleSubmitNew = async (event) => {
    event.preventDefault();
    if (!newLabel.trim()) {
      setError("enter a name to add a category.");
      return;
    }
    const created = await onCreateCategory(newLabel, newColor);
    if (!created) {
      setError("category already exists.");
      return;
    }
    onToggleCategory(created.id);
    setNewLabel("");
    setNewColor("#6b7280");
    setError("");
    setIsAdding(false);
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewLabel("");
    setError("");
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewLabel("");
    setNewColor("#6b7280");
    setError("");
  };

  const handleContextMenu = (event, category) => {
    event.preventDefault();
    setPendingDeleteCategory(category);
  };

  const handleDragStart = (event, category) => {
    if (!category) {
      return;
    }
    event.dataTransfer.effectAllowed = "copy";
    try {
      event.dataTransfer.setData(CATEGORY_DRAG_TYPE, category.id);
      event.dataTransfer.setData("text/plain", category.label);
    } catch (error) {
      // ignore dataTransfer failures (e.g., Firefox)
    }
    event.currentTarget.classList.add("category-chip-dragging");
  };

  const handleDragEnd = (event) => {
    event.currentTarget.classList.remove("category-chip-dragging");
  };

  return (
    <section className="category-panel" aria-label="task categories">
      <div className="category-panel-header">
        <h3>categories</h3>
        <div className="category-panel-actions">
          {isAdding ? (
            <button type="button" onClick={handleCancel}>
              cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleStartAdd}
            aria-label="add a new category"
            disabled={isAdding}
          >
            +
          </button>
        </div>
      </div>
      <div
        className="category-chip-group"
        role="group"
        aria-label="select categories"
      >
        {categories.map((category) => {
          const isSelected = selected.includes(category.id);
          return (
            <button
              key={category.id}
              type="button"
              className={`category-chip${
                isSelected ? " category-chip-selected" : ""
              }`}
              style={{ "--chip-color": category.color }}
              onClick={() => handleToggle(category.id)}
              onContextMenu={(event) => handleContextMenu(event, category)}
              aria-pressed={isSelected}
              title="right click to delete"
              draggable
              onDragStart={(event) => handleDragStart(event, category)}
              onDragEnd={handleDragEnd}
            >
              <span className="category-chip-dot" aria-hidden="true" />
              <span className="category-chip-label">{category.label}</span>
            </button>
          );
        })}
      </div>
      {isAdding ? (
        <form className="category-add-form" onSubmit={handleSubmitNew}>
          <label htmlFor="new-category" className="sr-only">
            new category name
          </label>
          <input
            id="new-category"
            type="text"
            value={newLabel}
            onChange={(event) => {
              setNewLabel(event.target.value);
              if (error) {
                setError("");
              }
            }}
            placeholder="add category name"
            autoFocus
          />
          <button type="submit">save</button>
          <div
            className="category-color-swatches"
            role="group"
            aria-label="pick a colour"
          >
            {[
              "#2563eb",
              "#059669",
              "#d97706",
              "#9333ea",
              "#dc2626",
              "#0891b2",
              "#65a30d",
              "#6b7280",
            ].map((color) => (
              <button
                key={color}
                type="button"
                className={`category-color-swatch${newColor === color ? " active" : ""}`}
                style={{ "--swatch-color": color }}
                onClick={() => setNewColor(color)}
                aria-pressed={newColor === color}
                aria-label={`colour ${color}`}
              />
            ))}
          </div>
        </form>
      ) : null}
      {error ? <p className="category-error">{error}</p> : null}
      {pendingDeleteCategory && (
        <div className="category-confirm" role="alert">
          <span>delete &ldquo;{pendingDeleteCategory.label}&rdquo;?</span>
          <div className="category-confirm-actions">
            <button
              type="button"
              onClick={() => setPendingDeleteCategory(null)}
            >
              cancel
            </button>
            <button
              type="button"
              className="category-confirm-delete"
              onClick={() => {
                onRemoveCategory(pendingDeleteCategory.id);
                setPendingDeleteCategory(null);
              }}
            >
              delete
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

CategoryPanel.propTypes = {
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      color: PropTypes.string.isRequired,
    }),
  ).isRequired,
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggleCategory: PropTypes.func.isRequired,
  onCreateCategory: PropTypes.func.isRequired,
  onRemoveCategory: PropTypes.func.isRequired,
};

export default CategoryPanel;
