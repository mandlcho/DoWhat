import PropTypes from "prop-types";
import CalendarPicker from "./CalendarPicker";
import CategoryPanel from "./CategoryPanel";

function TodoComposer({
  title,
  description,
  dueDate,
  onTitleChange,
  onDescriptionChange,
  onDueDateChange,
  onSubmit,
  dueHighlights,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  viewMode,
  columns,
  priorityFocus,
  onPriorityFocus,
  priorityOptions,
  composerPriority,
  onComposerPriorityChange,
  categories,
  selectedCategories,
  onToggleCategory,
  onCreateCategory,
  onRemoveCategory,
  onCalendarHoverDueDate,
  error = "",
}) {
  return (
    <section className="composer">
      <div className="composer-layout">
        <form id="todo-composer-form" onSubmit={onSubmit}>
          <input
            type="text"
            name="title"
            placeholder="add a task to backlog"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            aria-label="task title"
            required
            autoComplete="off"
            className="composer-input"
          />
          <textarea
            name="description"
            placeholder="add a short description (optional)"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            aria-label="task description"
            rows={2}
            className="composer-textarea"
          />
          <div className="composer-priority-row">
            <span className="composer-priority-label">priority</span>
            <div
              className="composer-priority-options"
              role="group"
              aria-label="set task priority"
            >
              {priorityOptions.map(({ value, label }) => {
                const isActive = composerPriority === value;
                return (
                  <button
                    key={value}
                    type="button"
                    className={`composer-priority-button priority-${value}${isActive ? " active" : ""}`}
                    onClick={() => onComposerPriorityChange(value)}
                    aria-pressed={isActive}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <button type="submit" className="composer-submit-inline">
            add
          </button>
        </form>
        <div className="composer-sidebar">
          <CategoryPanel
            categories={categories}
            selected={selectedCategories}
            onToggleCategory={onToggleCategory}
            onCreateCategory={onCreateCategory}
            onRemoveCategory={onRemoveCategory}
          />
          <div className="composer-calendar">
            <h3>due date</h3>
            <CalendarPicker
              value={dueDate}
              onChange={onDueDateChange}
              highlights={dueHighlights}
              onHoverDate={onCalendarHoverDueDate}
            />
          </div>
        </div>
      </div>
      {error && <p className="composer-error">{error}</p>}
      <div className="filter-row">
        <div
          className={viewMode === "list" ? "filters" : "filters filters-hidden"}
          role="radiogroup"
          aria-label="filter tasks"
          aria-hidden={viewMode !== "list"}
        >
          {columns.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={filter === key ? "active" : ""}
              onClick={() => onFilterChange(key)}
              role="radio"
              aria-checked={filter === key}
              tabIndex={viewMode === "list" ? 0 : -1}
              disabled={viewMode !== "list"}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="search-input"
          placeholder="search tasks..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="search tasks"
        />
        <div className="priority-focus-filter">
          <span>filter</span>
          <div
            className="priority-focus-options"
            role="group"
            aria-label="filter tasks by priority"
          >
            {priorityOptions.map(({ value, label }) => {
              const isActive = priorityFocus === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={`priority-focus-button priority-${value}${
                    isActive ? " active" : ""
                  }`}
                  onClick={() => onPriorityFocus(value)}
                  aria-pressed={isActive}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

TodoComposer.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  dueDate: PropTypes.string.isRequired,
  priorityOptions: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onTitleChange: PropTypes.func.isRequired,
  onDescriptionChange: PropTypes.func.isRequired,
  onDueDateChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  dueHighlights: PropTypes.object.isRequired,
  filter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  viewMode: PropTypes.oneOf(["list", "card"]).isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  composerPriority: PropTypes.string.isRequired,
  onComposerPriorityChange: PropTypes.func.isRequired,
  priorityFocus: PropTypes.string.isRequired,
  onPriorityFocus: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      color: PropTypes.string.isRequired,
    }),
  ).isRequired,
  selectedCategories: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggleCategory: PropTypes.func.isRequired,
  onCreateCategory: PropTypes.func.isRequired,
  onRemoveCategory: PropTypes.func.isRequired,
  onCalendarHoverDueDate: PropTypes.func,
  error: PropTypes.string,
};

export default TodoComposer;
