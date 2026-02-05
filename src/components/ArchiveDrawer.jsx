import PropTypes from "prop-types";
import { TODO_PRIORITIES, DEFAULT_PRIORITY } from "../hooks/useTodos";
import { formatTimestamp, formatDate } from "../utils/todoFormatting";
import { ARCHIVED_TODO_DRAG_TYPE } from "../utils/dragTypes";

const DEFAULT_TAG_COLOR = "#6b7280";

function ArchiveDrawer({
  todos,
  isOpen,
  drawerRef = null,
  onRemove,
  onClose = null,
  categoryLookup = null,
  onRemoveCategory = null,
  onBeginDrag = null,
  onEndDrag = null,
}) {
  if (todos.length === 0) {
    return null;
  }

  return (
    <aside
      id="archive-drawer"
      ref={drawerRef}
      className={`archive-drawer${isOpen ? " open" : ""}`}
      role="region"
      aria-label="archived tasks"
      aria-hidden={!isOpen}
    >
      <div className="archive-header">
        <h2>archive</h2>
        <span>{todos.length}</span>
        {typeof onClose === "function" && (
          <button
            type="button"
            className="archive-close"
            onClick={onClose}
            aria-label="close archive"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="4" x2="4" y2="12"></line>
              <line x1="4" y1="4" x2="12" y2="12"></line>
            </svg>
          </button>
        )}
      </div>
      <ul>
        {todos.map((todo) => {
          const currentPriority = TODO_PRIORITIES.includes(todo.priority)
            ? todo.priority
            : DEFAULT_PRIORITY;
          const archivedLabel = formatTimestamp(todo.archivedAt);
          const completedLabel = todo.completedAt
            ? formatTimestamp(todo.completedAt)
            : null;
          const dueLabel = todo.dueDate ? formatDate(todo.dueDate) : null;
          const todoCategories = Array.isArray(todo.categories)
            ? todo.categories
                .map((categoryId) => {
                  const existing =
                    categoryLookup && typeof categoryLookup.get === "function"
                      ? categoryLookup.get(categoryId)
                      : null;
                  if (existing) {
                    return existing;
                  }
                  if (typeof categoryId === "string" && categoryId.trim()) {
                    return {
                      id: categoryId,
                      label: categoryId.trim(),
                      color: DEFAULT_TAG_COLOR,
                    };
                  }
                  return null;
                })
                .filter(Boolean)
            : [];

          const handleCategoryContextMenu = (event, category) => {
            if (!category || typeof onRemoveCategory !== "function") {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            onRemoveCategory(todo.id, category.id);
          };

          const handleDragStart = (event) => {
            event.dataTransfer.effectAllowed = "copy";
            try {
              event.dataTransfer.setData(ARCHIVED_TODO_DRAG_TYPE, todo.id);
              event.dataTransfer.setData("text/plain", todo.title);
            } catch (error) {
              // ignore setData failures
            }
            event.currentTarget.classList.add("archived-todo-dragging");
            onBeginDrag?.(todo.id);
          };

          const handleDragEnd = (event) => {
            event.currentTarget.classList.remove("archived-todo-dragging");
            onEndDrag?.();
          };

          return (
            <li
              key={todo.id}
              className="archived-todo"
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="archived-header">
                <span className="archived-title">{todo.title}</span>
                <div className="archived-actions">
                  <span
                    className={`todo-priority-badge priority-${currentPriority}`}
                    aria-label={`priority ${currentPriority}`}
                  >
                    {currentPriority}
                  </span>
                  <button
                    type="button"
                    className="archived-delete"
                    onClick={() => onRemove(todo.id)}
                    aria-label={`delete archived task ${todo.title}`}
                  >
                    X
                  </button>
                </div>
              </div>
              <p
                className={`archived-description${
                  todo.description ? "" : " archived-description--empty"
                }`}
              >
                {todo.description || "\u00a0"}
              </p>
              <div className="archived-meta">
                {todoCategories.length > 0 ? (
                  <div className="todo-category-tags todo-category-tags-inline archived-category-tags">
                    {todoCategories.map((category) => (
                      <span
                        key={category.id}
                        className="category-tag"
                        style={{
                          "--tag-color": category.color || DEFAULT_TAG_COLOR,
                        }}
                        onContextMenu={(event) =>
                          handleCategoryContextMenu(event, category)
                        }
                      >
                        {category.label}
                        {typeof onRemoveCategory === "function" && (
                          <button
                            type="button"
                            className="category-tag-remove"
                            onClick={() =>
                              onRemoveCategory(todo.id, category.id)
                            }
                            aria-label={`remove ${category.label} from ${todo.title}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="0.65em"
                              height="0.65em"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            >
                              <line x1="11" y1="5" x2="5" y2="11"></line>
                              <line x1="5" y1="5" x2="11" y2="11"></line>
                            </svg>
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : null}
                {archivedLabel && <span>archived: {archivedLabel}</span>}
                {dueLabel && <span>due: {dueLabel}</span>}
                {completedLabel && archivedLabel !== completedLabel && (
                  <span>done: {completedLabel}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

ArchiveDrawer.propTypes = {
  todos: PropTypes.arrayOf(PropTypes.object).isRequired,
  isOpen: PropTypes.bool.isRequired,
  drawerRef: PropTypes.shape({
    current: PropTypes.any,
  }),
  onRemove: PropTypes.func.isRequired,
  onClose: PropTypes.func,
  categoryLookup: PropTypes.instanceOf(Map),
  onRemoveCategory: PropTypes.func,
  onBeginDrag: PropTypes.func,
  onEndDrag: PropTypes.func,
};

export default ArchiveDrawer;
