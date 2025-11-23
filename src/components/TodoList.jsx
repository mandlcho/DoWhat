import PropTypes from "prop-types";
import TodoListItem from "./TodoListItem";
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

function TodoList({
  todos,
  actions,
  dragAndDrop = null,
  categoryLookup = null,
  calendarFocusDate = "",
  onAssignCategory = null,
  onRemoveCategory = null,
  onRestoreArchived = null,
  listStatus = "backlog"
}) {
  if (todos.length === 0) {
    return null;
  }

  const containerProps = dragAndDrop?.containerProps ?? {};

  const mergedContainerProps = {
    ...containerProps,
    onDragOver: (event) => {
      if (hasArchivedPayload(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "copy";
        return;
      }
      containerProps.onDragOver?.(event);
    },
    onDrop: (event) => {
      if (hasArchivedPayload(event)) {
        event.preventDefault();
        event.stopPropagation();
        const archivedId = event.dataTransfer.getData(ARCHIVED_TODO_DRAG_TYPE);
        if (archivedId && typeof onRestoreArchived === "function") {
          onRestoreArchived(archivedId, {
            status: listStatus,
            referenceId: null,
            position: "after"
          });
        }
        return;
      }
      containerProps.onDrop?.(event);
    }
  };

  return (
    <ul {...mergedContainerProps}>
      {todos.map((todo) => {
        const dragState = dragAndDrop?.getItemProps
          ? dragAndDrop.getItemProps(todo.id)
          : null;
        return (
          <TodoListItem
            key={todo.id}
            todo={todo}
            onToggle={actions.toggleTodo}
            onMoveToActive={actions.moveToActive}
            onUpdateStatus={actions.updateTodoStatus}
            onUpdatePriority={actions.updateTodoPriority}
            onDismiss={actions.handleDismiss}
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
            dragState={dragState}
            categoryLookup={categoryLookup}
            calendarFocusDate={calendarFocusDate}
            onAssignCategory={onAssignCategory}
            onRemoveCategory={onRemoveCategory}
            onRestoreArchived={onRestoreArchived}
            listStatus={listStatus}
          />
        );
      })}
    </ul>
  );
}

TodoList.propTypes = {
  todos: PropTypes.arrayOf(PropTypes.object).isRequired,
  actions: PropTypes.shape({
    toggleTodo: PropTypes.func.isRequired,
    moveToActive: PropTypes.func.isRequired,
    updateTodoStatus: PropTypes.func.isRequired,
    updateTodoPriority: PropTypes.func.isRequired,
    handleDismiss: PropTypes.func.isRequired
  }).isRequired,
  dragAndDrop: PropTypes.shape({
    containerProps: PropTypes.object,
    getItemProps: PropTypes.func
  }),
  categoryLookup: PropTypes.instanceOf(Map),
  calendarFocusDate: PropTypes.string,
  onAssignCategory: PropTypes.func,
  onRemoveCategory: PropTypes.func,
  onRestoreArchived: PropTypes.func,
  listStatus: PropTypes.string
};

export default TodoList;
