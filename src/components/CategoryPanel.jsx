import { useState } from "react";
import PropTypes from "prop-types";
import { CATEGORY_DRAG_TYPE } from "../utils/dragTypes";

function CategoryPanel({
  categories,
  selected,
  onToggleCategory,
  onCreateCategory,
  onRemoveCategory
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");

  const handleToggle = (categoryId) => {
    onToggleCategory(categoryId);
  };

  const handleSubmitNew = async (event) => {
    event.preventDefault();
    if (!newLabel.trim()) {
      setError("enter a name to add a category.");
      return;
    }
    const created = await onCreateCategory(newLabel);
    if (!created) {
      setError("category already exists.");
      return;
    }
    setNewLabel("");
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
    setError("");
  };

  const handleContextMenu = (event, category) => {
    event.preventDefault();
    const shouldRemove = window.confirm(
      `delete category "${category.label}"?`
    );
    if (!shouldRemove) {
      return;
    }
    onRemoveCategory(category.id);
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
      <div className="category-chip-group" role="group" aria-label="select categories">
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
        </form>
      ) : null}
      {error ? <p className="category-error">{error}</p> : null}
    </section>
  );
}

CategoryPanel.propTypes = {
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      color: PropTypes.string.isRequired
    })
  ).isRequired,
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggleCategory: PropTypes.func.isRequired,
  onCreateCategory: PropTypes.func.isRequired,
  onRemoveCategory: PropTypes.func.isRequired
};

export default CategoryPanel;
