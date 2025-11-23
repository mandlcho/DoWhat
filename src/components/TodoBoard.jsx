import PropTypes from "prop-types";
import { useMemo, useState } from "react";
import TodoCard from "./TodoCard";
import { useFlipAnimation } from "../hooks/useFlipAnimation";
import { ARCHIVED_TODO_DRAG_TYPE } from "../utils/dragTypes";

const hasArchivedPayload = (event) => {
  const types = event?.dataTransfer?.types;
  if (!types) {
    return false;
  }
  if (typeof types.includes === "function") {
    return types.includes(ARCHIVED_TODO_DRAG_TYPE);
  }
  return Array.from(types).includes(ARCHIVED_TODO_DRAG_TYPE);
};

function TodoBoard({
  columns,
  actions,
  dragAndDrop = null,
  categoryLookup = null,
  calendarFocusDate = "",
  onAssignCategory = null,
  onRemoveCategory = null,
  onRestoreArchived = null
}) {
  const [archivedDropColumn, setArchivedDropColumn] = useState("");

  const cardOrderSignature = useMemo(() => {
    return columns
      .map(({ key, todos }) =>
        todos
          .map((todo) => `${key}:${todo.id}`)
          .join("|")
      )
      .join("||");
  }, [columns]);

  const registerCard = useFlipAnimation({
    isEnabled: Boolean(dragAndDrop),
    dependencyList: [cardOrderSignature]
  });

  return (
    <div className="todo-board">
      {columns.map(({ key, label, todos }) => {
        const columnDnD = dragAndDrop?.getColumnProps
          ? dragAndDrop.getColumnProps(key)
          : { columnProps: {}, isDropTarget: false };

        return (
          <div
            key={key}
            className={`todo-column${
              columnDnD.isDropTarget ? " column-drop-target" : ""
            }${archivedDropColumn === key ? " column-drop-target" : ""}`}
            {...(() => {
              const baseProps = columnDnD.columnProps ?? {};
              return {
                ...baseProps,
                onDragOver: (event) => {
                  if (hasArchivedPayload(event)) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.dataTransfer.dropEffect = "copy";
                    setArchivedDropColumn(key);
                    return;
                  }
                  setArchivedDropColumn((prev) => (prev === key ? "" : prev));
                  baseProps.onDragOver?.(event);
                },
                onDrop: (event) => {
                  if (hasArchivedPayload(event)) {
                    event.preventDefault();
                    event.stopPropagation();
                    const todoId = event.dataTransfer.getData(ARCHIVED_TODO_DRAG_TYPE);
                    if (todoId && typeof onRestoreArchived === "function") {
                      onRestoreArchived(todoId, {
                        status: key,
                        referenceId: null,
                        position: "after"
                      });
                    }
                    setArchivedDropColumn("");
                    return;
                  }
                  baseProps.onDrop?.(event);
                },
                onDragLeave: (event) => {
                  if (hasArchivedPayload(event)) {
                    setArchivedDropColumn((prev) => (prev === key ? "" : prev));
                    return;
                  }
                  baseProps.onDragLeave?.(event);
                }
              };
            })()}
          >
            <h2>{label}</h2>
            {todos.length === 0 ? (
              <p className="column-empty">nothing here yet</p>
            ) : (
              <ul>
                {todos.map((todo) => {
                  const cardDnD = dragAndDrop?.getCardProps
                    ? dragAndDrop.getCardProps(todo.id, key)
                    : null;
                  return (
                    <TodoCard
                      key={todo.id}
                      todo={todo}
                      actions={actions}
                      syncState={
                        actions.syncStateById instanceof Map
                          ? actions.syncStateById.get(todo.id) ?? "synced"
                          : "synced"
                      }
                      syncError={
                        actions.syncErrorById instanceof Map
                          ? actions.syncErrorById.get(todo.id) ?? ""
                          : ""
                      }
                      onRetrySync={actions.retryTodoSync}
                      dragState={cardDnD}
                      categoryLookup={categoryLookup}
                      animationRef={registerCard(todo.id)}
                      calendarFocusDate={calendarFocusDate}
                      onAssignCategory={onAssignCategory}
                      onRemoveCategory={onRemoveCategory}
                      onRestoreArchived={onRestoreArchived}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

TodoBoard.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      todos: PropTypes.arrayOf(PropTypes.object).isRequired
    })
  ).isRequired,
  actions: PropTypes.shape({
    toggleTodo: PropTypes.func.isRequired,
    moveToActive: PropTypes.func.isRequired,
    updateTodoStatus: PropTypes.func.isRequired,
    updateTodoPriority: PropTypes.func.isRequired,
    handleDismiss: PropTypes.func.isRequired
  }).isRequired,
  dragAndDrop: PropTypes.shape({
    getColumnProps: PropTypes.func,
    getCardProps: PropTypes.func
  }),
  categoryLookup: PropTypes.instanceOf(Map),
  calendarFocusDate: PropTypes.string,
  onAssignCategory: PropTypes.func,
  onRemoveCategory: PropTypes.func,
  onRestoreArchived: PropTypes.func
};

export default TodoBoard;
