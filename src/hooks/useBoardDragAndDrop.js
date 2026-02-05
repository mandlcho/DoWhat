import { useCallback, useEffect, useState } from "react";

export function useBoardDragAndDrop({ isEnabled, columns, setTodos }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dragOverTodoId, setDragOverTodoId] = useState(null);
  const [dragPosition, setDragPosition] = useState("before");

  const reset = useCallback(() => {
    setDraggingId(null);
    setDragOverColumn(null);
    setDragOverTodoId(null);
    setDragPosition("before");
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      reset();
    }
  }, [isEnabled, reset]);

  const moveTodoInBoard = useCallback(
    (sourceId, targetStatus, targetId, position = "before") => {
      if (!sourceId) {
        return;
      }

      setTodos((prev) => {
        const sourceIndex = prev.findIndex((todo) => todo.id === sourceId);
        if (sourceIndex === -1) {
          return prev;
        }

        const sourceTodo = prev[sourceIndex];
        const timestamp = new Date().toISOString();
        const nextStatus =
          typeof targetStatus === "string" ? targetStatus : sourceTodo.status;
        const statusChanged = nextStatus !== sourceTodo.status;

        const updatedTodo = statusChanged
          ? {
              ...sourceTodo,
              status: nextStatus,
              completed: nextStatus === "completed",
              activatedAt:
                nextStatus === "active"
                  ? (sourceTodo.activatedAt ?? timestamp)
                  : nextStatus === "completed"
                    ? (sourceTodo.activatedAt ?? timestamp)
                    : null,
              completedAt: nextStatus === "completed" ? timestamp : null,
            }
          : sourceTodo;

        const remaining = [...prev];
        remaining.splice(sourceIndex, 1);

        const columnOrder = columns.map(({ key }) => key);
        const computeDefaultInsertion = () => {
          const matchingIndices = [];
          remaining.forEach((todo, index) => {
            if (todo.status === nextStatus) {
              matchingIndices.push(index);
            }
          });
          if (matchingIndices.length === 0) {
            const targetColumnIndex = columnOrder.indexOf(nextStatus);
            if (targetColumnIndex === -1) {
              return remaining.length;
            }
            const afterIndex = remaining.findIndex((todo) => {
              const statusIndex = columnOrder.indexOf(todo.status);
              return statusIndex !== -1 && statusIndex > targetColumnIndex;
            });
            return afterIndex === -1 ? remaining.length : afterIndex;
          }
          return position === "before"
            ? matchingIndices[0]
            : matchingIndices[matchingIndices.length - 1] + 1;
        };

        let insertionIndex = computeDefaultInsertion();
        if (targetId) {
          const targetIndex = remaining.findIndex(
            (todo) => todo.id === targetId,
          );
          if (targetIndex !== -1) {
            insertionIndex =
              position === "after" ? targetIndex + 1 : targetIndex;
          }
        }

        const next = [
          ...remaining.slice(0, insertionIndex),
          statusChanged ? updatedTodo : { ...updatedTodo },
          ...remaining.slice(insertionIndex),
        ];

        return next;
      });
    },
    [columns, setTodos],
  );

  const handleDragStart = useCallback(
    (event, todoId, columnKey) => {
      if (!isEnabled) {
        return;
      }
      event.dataTransfer.effectAllowed = "move";
      try {
        event.dataTransfer.setData("text/plain", todoId);
      } catch (error) {
        // ignore setData failures in some browsers
      }
      setDraggingId(todoId);
      setDragOverColumn(columnKey);
      setDragOverTodoId(todoId);
      setDragPosition("before");
    },
    [isEnabled],
  );

  const handleDragOver = useCallback(
    (event, todoId, columnKey) => {
      if (!isEnabled || !draggingId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      if (todoId === draggingId) {
        return;
      }
      const bounds = event.currentTarget.getBoundingClientRect();
      const offsetY = event.clientY - bounds.top;
      const position = offsetY > bounds.height / 2 ? "after" : "before";
      setDragOverColumn(columnKey);
      setDragOverTodoId(todoId);
      setDragPosition(position);
    },
    [isEnabled, draggingId],
  );

  const handleDropOnTodo = useCallback(
    (event, todoId, columnKey) => {
      if (!isEnabled || !draggingId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (todoId === draggingId) {
        reset();
        return;
      }
      moveTodoInBoard(draggingId, columnKey, todoId, dragPosition);
      reset();
    },
    [isEnabled, draggingId, dragPosition, moveTodoInBoard, reset],
  );

  const handleColumnDragOver = useCallback(
    (event, columnKey) => {
      if (!isEnabled || !draggingId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      setDragOverColumn(columnKey);
      setDragOverTodoId(null);
      setDragPosition("after");
    },
    [isEnabled, draggingId],
  );

  const handleColumnDrop = useCallback(
    (event, columnKey) => {
      if (!isEnabled || !draggingId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      moveTodoInBoard(draggingId, columnKey, null, "after");
      reset();
    },
    [isEnabled, draggingId, moveTodoInBoard, reset],
  );

  const handleDragEnd = useCallback(() => {
    if (!draggingId) {
      return;
    }
    reset();
  }, [draggingId, reset]);

  const getCardProps = useCallback(
    (todoId, columnKey) => {
      const isDragging = isEnabled && draggingId === todoId;
      const isDropTarget =
        isEnabled &&
        dragOverTodoId === todoId &&
        draggingId !== todoId &&
        dragOverColumn === columnKey;
      const dropPosition = isDropTarget ? dragPosition : null;

      const dragProps = isEnabled
        ? {
            draggable: true,
            onDragStart: (event) => handleDragStart(event, todoId, columnKey),
            onDragOver: (event) => handleDragOver(event, todoId, columnKey),
            onDrop: (event) => handleDropOnTodo(event, todoId, columnKey),
            onDragEnd: handleDragEnd,
            "aria-grabbed": isDragging || undefined,
          }
        : { draggable: false };

      return { dragProps, isDragging, isDropTarget, dropPosition };
    },
    [
      isEnabled,
      draggingId,
      dragOverTodoId,
      dragOverColumn,
      dragPosition,
      handleDragStart,
      handleDragOver,
      handleDropOnTodo,
      handleDragEnd,
    ],
  );

  const getColumnProps = useCallback(
    (columnKey) => {
      const isDropTarget =
        isEnabled &&
        dragOverColumn === columnKey &&
        (!dragOverTodoId || dragOverTodoId === draggingId);

      const columnProps = isEnabled
        ? {
            onDragOver: (event) => handleColumnDragOver(event, columnKey),
            onDrop: (event) => handleColumnDrop(event, columnKey),
          }
        : {};

      return { columnProps, isDropTarget };
    },
    [
      isEnabled,
      dragOverColumn,
      dragOverTodoId,
      draggingId,
      handleColumnDragOver,
      handleColumnDrop,
    ],
  );

  return {
    getCardProps,
    getColumnProps,
    reset,
  };
}
