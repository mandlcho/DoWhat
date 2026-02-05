import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "./AppHeader";
import TodoComposer from "./TodoComposer";
import TodoList from "./TodoList";
import TodoBoard from "./TodoBoard";
import ArchiveDrawer from "./ArchiveDrawer";
import AppFooter from "./AppFooter";
import { useTodos, TODO_PRIORITIES, DEFAULT_PRIORITY } from "../hooks/useTodos";
import { useListDragAndDrop } from "../hooks/useListDragAndDrop";
import { useBoardDragAndDrop } from "../hooks/useBoardDragAndDrop";
import { useThemePreference } from "../hooks/useThemePreference";
import { useCategories } from "../hooks/useCategories";
import { PRIORITY_OPTIONS } from "../utils/todoFormatting";
import "../App.css";

const FILTERS = {
  backlog: (todo) => todo.status === "backlog",
  active: (todo) => todo.status === "active",
  completed: (todo) => todo.status === "completed",
};

const CARD_COLUMNS = [
  { key: "backlog", label: "backlog" },
  { key: "active", label: "active" },
  { key: "completed", label: "done" },
];

function DoWhatApp() {
  const {
    todos,
    setTodos,
    stats,
    archivedTodos,
    syncStateById,
    syncErrorById,
    addTodo,
    updateTodo,
    retryTodoSync,
    deleteTodo,
    loading: todosLoading,
  } = useTodos();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priorityFocus, setPriorityFocus] = useState("");
  const [calendarHoverDate, setCalendarHoverDate] = useState("");
  const [filter, setFilter] = useState("backlog");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [composerPriority, setComposerPriority] = useState(DEFAULT_PRIORITY);
  const [composerError, setComposerError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const archiveDrawerRef = useRef(null);
  const archiveToggleRef = useRef(null);
  const isListView = viewMode === "list";
  const isCardView = viewMode === "card";
  const { theme, setTheme } = useThemePreference();
  const {
    categories,
    addCategory,
    removeCategory,
    loading: categoriesLoading,
  } = useCategories();

  const categoryLookup = useMemo(() => {
    const lookup = new Map();
    categories.forEach((category) => {
      lookup.set(category.id, category);
    });
    return lookup;
  }, [categories]);

  useEffect(() => {
    if (archivedTodos.length === 0) {
      setIsArchiveOpen(false);
    }
  }, [archivedTodos.length]);

  useEffect(() => {
    if (!isArchiveOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const drawerNode = archiveDrawerRef.current;
      const toggleNode = archiveToggleRef.current;
      const target = event.target;

      if (
        (drawerNode && drawerNode.contains(target)) ||
        (toggleNode && toggleNode.contains(target))
      ) {
        return;
      }

      setIsArchiveOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isArchiveOpen]);

  const handlePriorityFocus = useCallback((value) => {
    if (!TODO_PRIORITIES.includes(value)) {
      return;
    }
    setPriorityFocus((prev) => (prev === value ? "" : value));
  }, []);

  const handleToggleCategory = useCallback((categoryId) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  }, []);

  const handleCreateCategory = useCallback(
    async (label, color) => {
      const created = await addCategory(label, color);
      if (created) {
        setSelectedCategories((prev) =>
          prev.includes(created.id) ? prev : [...prev, created.id],
        );
      }
      return created;
    },
    [addCategory],
  );

  const handleRemoveCategory = useCallback(
    async (categoryId) => {
      if (!categoryId) {
        return;
      }
      await removeCategory(categoryId);
      setSelectedCategories((prev) => prev.filter((id) => id !== categoryId));
      // Strip orphaned category ID from all todos that reference it
      const affected = todos.filter(
        (todo) =>
          Array.isArray(todo.categories) &&
          todo.categories.includes(categoryId),
      );
      await Promise.all(
        affected.map((todo) =>
          updateTodo(todo.id, {
            categories: todo.categories.filter((id) => id !== categoryId),
          }),
        ),
      );
    },
    [removeCategory, todos, updateTodo],
  );

  const handleAssignCategory = useCallback(
    async (todoId, categoryId) => {
      if (!todoId || !categoryId) {
        return;
      }
      const todo = todos.find((t) => t.id === todoId);
      if (!todo) return;

      const currentCategories = Array.isArray(todo.categories)
        ? todo.categories
        : [];
      if (currentCategories.includes(categoryId)) {
        return;
      }

      await updateTodo(todoId, {
        categories: [...currentCategories, categoryId],
      });
    },
    [todos, updateTodo],
  );

  const archiveCompleted = useCallback(async () => {
    const completedTodos = todos.filter(
      (todo) =>
        todo.status === "completed" || todo.completed || todo.is_complete,
    );

    if (completedTodos.length === 0) {
      return;
    }

    const archiveTimestamp = new Date().toISOString();

    await Promise.all(
      completedTodos.map((todo) =>
        updateTodo(todo.id, { archivedAt: archiveTimestamp }),
      ),
    );
  }, [todos, updateTodo]);

  const reorderByPriorityFocus = useCallback(
    (items) => {
      if (!priorityFocus || !TODO_PRIORITIES.includes(priorityFocus)) {
        return items;
      }
      const prioritized = [];
      const others = [];
      items.forEach((item) => {
        if (item.priority === priorityFocus) {
          prioritized.push(item);
        } else {
          others.push(item);
        }
      });
      return prioritized.length ? [...prioritized, ...others] : items;
    },
    [priorityFocus],
  );

  const searchFilter = useCallback(
    (items) => {
      if (!searchQuery.trim()) return items;
      const q = searchQuery.trim().toLowerCase();
      return items.filter(
        (todo) =>
          (todo.title && todo.title.toLowerCase().includes(q)) ||
          (todo.description && todo.description.toLowerCase().includes(q)),
      );
    },
    [searchQuery],
  );

  const filteredTodos = useMemo(() => {
    const list = todos.filter(FILTERS[filter]);
    return reorderByPriorityFocus(searchFilter(list));
  }, [todos, filter, reorderByPriorityFocus, searchFilter]);

  const boardColumns = useMemo(
    () =>
      CARD_COLUMNS.map(({ key, label }) => ({
        key,
        label,
        todos: reorderByPriorityFocus(searchFilter(todos.filter(FILTERS[key]))),
      })),
    [todos, reorderByPriorityFocus, searchFilter],
  );

  const sortedArchivedTodos = useMemo(() => {
    if (archivedTodos.length === 0) {
      return [];
    }
    return [...archivedTodos].sort((a, b) => {
      const aTime = new Date(
        a.archivedAt ?? a.completedAt ?? a.createdAt,
      ).getTime();
      const bTime = new Date(
        b.archivedAt ?? b.completedAt ?? b.createdAt,
      ).getTime();
      return bTime - aTime;
    });
  }, [archivedTodos]);

  const listDragAndDrop = useListDragAndDrop({
    isEnabled: isListView,
    todos: filteredTodos,
    setTodos,
  });

  const boardDragAndDrop = useBoardDragAndDrop({
    isEnabled: isCardView,
    columns: CARD_COLUMNS,
    setTodos: (fn) => setTodos(fn(todos)),
  });

  const dueDateHighlights = useMemo(() => {
    const priorityOrder = new Map(
      TODO_PRIORITIES.map((priority, index) => [priority, index]),
    );
    const map = new Map();

    todos.forEach((todo) => {
      if (!todo.dueDate || typeof todo.dueDate !== "string") {
        return;
      }
      const iso = todo.dueDate.slice(0, 10);
      if (!iso) {
        return;
      }
      const priority = TODO_PRIORITIES.includes(todo.priority)
        ? todo.priority
        : DEFAULT_PRIORITY;
      const existing = map.get(iso);
      if (existing) {
        existing.push(priority);
      } else {
        map.set(iso, [priority]);
      }
    });

    return Object.fromEntries(
      Array.from(map.entries()).map(([iso, priorities]) => {
        const ordered = [...priorities].sort(
          (a, b) =>
            (priorityOrder.get(a) ?? Number.POSITIVE_INFINITY) -
            (priorityOrder.get(b) ?? Number.POSITIVE_INFINITY),
        );
        return [iso, { count: ordered.length, priorities: ordered }];
      }),
    );
  }, [todos]);

  const handleDueDateChange = useCallback((nextValue) => {
    setDueDate(nextValue);
    if (nextValue) {
      setComposerError("");
    }
  }, []);

  const handleCalendarHover = useCallback((iso) => {
    setCalendarHoverDate(iso || "");
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!title.trim()) return;
      const nextTodo = {
        title: title.trim(),
        description: description.trim(),
        priority: composerPriority,
        status: "backlog",
        is_complete: false,
        due_date: dueDate ? dueDate.trim() : null,
        categories: [...selectedCategories],
      };

      const result = await addTodo(nextTodo);
      if (!result?.success || !result?.todo) {
        setComposerError(
          result?.error?.message ||
            "unable to save that task right now. please try again.",
        );
        return;
      }

      setTitle("");
      setDescription("");
      setDueDate("");
      setComposerPriority(DEFAULT_PRIORITY);
      setSelectedCategories([]);
      setComposerError("");
    },
    [
      title,
      description,
      dueDate,
      composerPriority,
      addTodo,
      selectedCategories,
    ],
  );

  const updateTodoStatus = useCallback(
    async (id, status) => {
      const todo = todos.find((t) => t.id === id);
      if (!todo) {
        console.error("[updateTodoStatus] Todo not found:", id);
        return;
      }

      const updates = {
        status,
        is_complete: status === "completed",
      };

      console.log("[updateTodoStatus] Updating status:", {
        id,
        currentStatus: todo.status,
        newStatus: status,
        updates,
      });
      await updateTodo(id, updates);
    },
    [todos, updateTodo],
  );

  const toggleTodo = useCallback(
    (id, checked) => {
      updateTodoStatus(id, checked ? "completed" : "active");
    },
    [updateTodoStatus],
  );

  const moveToBacklog = useCallback(
    (id) => {
      updateTodoStatus(id, "backlog");
    },
    [updateTodoStatus],
  );

  const moveToActive = useCallback(
    (id) => {
      updateTodoStatus(id, "active");
    },
    [updateTodoStatus],
  );

  const updateTodoPriority = useCallback(
    async (id, value) => {
      if (!TODO_PRIORITIES.includes(value)) {
        return;
      }
      await updateTodo(id, { priority: value });
    },
    [updateTodo],
  );

  const removeTodo = useCallback(
    async (id) => {
      await deleteTodo(id);
    },
    [deleteTodo],
  );

  const handleDismiss = useCallback(
    async (todo) => {
      // Active task: Move back to backlog (soft dismiss)
      if (todo.status === "active") {
        moveToBacklog(todo.id);
        return;
      }

      // Done/Completed task: Archive automatically (preserve completed work)
      if (todo.status === "completed" || todo.completed || todo.is_complete) {
        const archiveTimestamp = new Date().toISOString();
        await updateTodo(todo.id, { archivedAt: archiveTimestamp });
        return;
      }

      // Backlog task (or fallback): show inline confirmation
      setPendingDeleteId(todo.id);
    },
    [moveToBacklog, updateTodo],
  );

  const confirmDelete = useCallback(async () => {
    if (pendingDeleteId) {
      await removeTodo(pendingDeleteId);
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, removeTodo]);

  const cancelDelete = useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  const removeArchivedTodo = useCallback(
    async (id) => {
      await deleteTodo(id);
    },
    [deleteTodo],
  );

  const handleRemoveCategoryFromTodo = useCallback(
    async (todoId, categoryId) => {
      if (!todoId || !categoryId) {
        return;
      }
      const todo = todos.find((t) => t.id === todoId);
      if (!todo || !Array.isArray(todo.categories)) return;

      const nextCategories = todo.categories.filter(
        (category) => category !== categoryId,
      );
      await updateTodo(todoId, { categories: nextCategories });
    },
    [todos, updateTodo],
  );

  const handleRemoveCategoryFromArchived = useCallback(
    async (todoId, categoryId) => {
      if (!todoId || !categoryId) {
        return;
      }
      const todo = archivedTodos.find((t) => t.id === todoId);
      if (!todo || !Array.isArray(todo.categories)) return;

      const nextCategories = todo.categories.filter(
        (category) => category !== categoryId,
      );
      await updateTodo(todoId, { categories: nextCategories });
    },
    [archivedTodos, updateTodo],
  );

  const restoreArchivedTodo = useCallback(
    async (todoId, context = {}) => {
      if (!todoId) {
        return;
      }
      const updates = { archivedAt: null };

      // If a specific status is provided, update it
      if (context.status) {
        updates.status = context.status;
        updates.is_complete = context.status === "completed";
      }

      await updateTodo(todoId, updates);
    },
    [updateTodo],
  );

  const todoActions = useMemo(
    () => ({
      toggleTodo,
      moveToActive,
      updateTodoStatus,
      updateTodoPriority,
      handleDismiss,
      syncStateById,
      syncErrorById,
      retryTodoSync,
    }),
    [
      toggleTodo,
      moveToActive,
      updateTodoStatus,
      updateTodoPriority,
      handleDismiss,
      syncStateById,
      syncErrorById,
      retryTodoSync,
    ],
  );

  const handleToggleArchive = useCallback(() => {
    setIsArchiveOpen((prev) => !prev);
  }, []);

  if (todosLoading || categoriesLoading) {
    return (
      <div className="loading-shell">
        <div className="loading-skeleton">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line skeleton-line--input" />
          <div className="skeleton-line skeleton-line--item" />
          <div className="skeleton-line skeleton-line--item skeleton-line--short" />
          <div className="skeleton-line skeleton-line--item" />
        </div>
      </div>
    );
  }

  return (
    <main className="app-shell">
      <AppHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        themeMode={theme}
        onThemeModeChange={setTheme}
      />

      <TodoComposer
        title={title}
        description={description}
        dueDate={dueDate}
        priorityOptions={PRIORITY_OPTIONS}
        composerPriority={composerPriority}
        onComposerPriorityChange={setComposerPriority}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onDueDateChange={handleDueDateChange}
        onSubmit={handleSubmit}
        dueHighlights={dueDateHighlights}
        filter={filter}
        onFilterChange={setFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        columns={CARD_COLUMNS}
        priorityFocus={priorityFocus}
        onPriorityFocus={handlePriorityFocus}
        categories={categories}
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
        onCreateCategory={handleCreateCategory}
        onRemoveCategory={handleRemoveCategory}
        onCalendarHoverDueDate={handleCalendarHover}
        error={composerError}
      />

      <section
        className={`todo-list${viewMode === "card" ? " card-view" : ""}`}
        aria-live="polite"
      >
        {viewMode === "card" ? (
          todos.length === 0 ? (
            <div className="empty-state empty-state-onboard">
              <p className="empty-state-title">no tasks yet</p>
              <p className="empty-state-hint">
                type a task above and hit add. use the calendar to set a due
                date, and pick categories to organise as you go.
              </p>
            </div>
          ) : (
            <TodoBoard
              columns={boardColumns}
              actions={todoActions}
              dragAndDrop={boardDragAndDrop}
              categoryLookup={categoryLookup}
              calendarFocusDate={calendarHoverDate}
              onAssignCategory={handleAssignCategory}
              onRemoveCategory={handleRemoveCategoryFromTodo}
              onRestoreArchived={restoreArchivedTodo}
            />
          )
        ) : filteredTodos.length === 0 ? (
          <div className="empty-state empty-state-onboard">
            {todos.length === 0 ? (
              <>
                <p className="empty-state-title">no tasks yet</p>
                <p className="empty-state-hint">
                  type a task above and hit add. use the calendar to set a due
                  date, and pick categories to organise as you go.
                </p>
              </>
            ) : (
              <p className="empty-state-title">
                {filter === "active"
                  ? "no active tasks"
                  : filter === "completed"
                    ? "nothing done yet"
                    : "backlog is empty"}
              </p>
            )}
          </div>
        ) : (
          <TodoList
            todos={filteredTodos}
            actions={todoActions}
            dragAndDrop={listDragAndDrop}
            categoryLookup={categoryLookup}
            calendarFocusDate={calendarHoverDate}
            onAssignCategory={handleAssignCategory}
            onRemoveCategory={handleRemoveCategoryFromTodo}
            onRestoreArchived={restoreArchivedTodo}
            listStatus={filter}
          />
        )}
      </section>

      {pendingDeleteId &&
        (() => {
          const pendingTodo = todos.find((t) => t.id === pendingDeleteId);
          return (
            <div className="confirm-bar" role="alert">
              <span>
                delete &ldquo;{pendingTodo?.title ?? "this task"}&rdquo;? this
                cannot be undone.
              </span>
              <div className="confirm-bar-actions">
                <button
                  type="button"
                  className="confirm-bar-cancel"
                  onClick={cancelDelete}
                >
                  cancel
                </button>
                <button
                  type="button"
                  className="confirm-bar-confirm"
                  onClick={confirmDelete}
                >
                  delete
                </button>
              </div>
            </div>
          );
        })()}

      <AppFooter
        stats={stats}
        onArchiveCompleted={archiveCompleted}
        onToggleArchive={handleToggleArchive}
        isArchiveOpen={isArchiveOpen}
        archivedCount={archivedTodos.length}
        archiveToggleRef={archiveToggleRef}
      />

      <ArchiveDrawer
        todos={sortedArchivedTodos}
        isOpen={isArchiveOpen}
        drawerRef={archiveDrawerRef}
        onRemove={removeArchivedTodo}
        onClose={handleToggleArchive}
        categoryLookup={categoryLookup}
        onRemoveCategory={handleRemoveCategoryFromArchived}
      />
    </main>
  );
}

export default DoWhatApp;
