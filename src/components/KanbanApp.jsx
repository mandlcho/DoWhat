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
  completed: (todo) => todo.status === "completed"
};

const CARD_COLUMNS = [
  { key: "backlog", label: "backlog" },
  { key: "active", label: "active" },
  { key: "completed", label: "done" }
];

function KanbanApp() {
  const { 
    todos, 
    setTodos, 
    stats, 
    archivedTodos, 
    setArchivedTodos, 
    syncStateById,
    syncErrorById,
    addTodo, 
    updateTodo, 
    retryTodoSync,
    deleteTodo,
    loading: todosLoading 
  } = useTodos();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priorityFocus, setPriorityFocus] = useState("");
  const [calendarHoverDate, setCalendarHoverDate] = useState("");
  const [filter, setFilter] = useState("backlog");
  const [viewMode, setViewMode] = useState("list");
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [composerError, setComposerError] = useState("");
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
    loading: categoriesLoading 
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
    async (label) => {
      const created = await addCategory(label);
      if (created) {
        setSelectedCategories((prev) =>
          prev.includes(created.id) ? prev : [...prev, created.id]
        );
      }
      return created;
    },
    [addCategory]
  );

  const handleRemoveCategory = useCallback(
    async (categoryId) => {
      if (!categoryId) {
        return;
      }
      await removeCategory(categoryId);
      setSelectedCategories((prev) =>
        prev.filter((id) => id !== categoryId)
      );
      // The backend will handle cascades or we'll need to update todos separately
    },
    [removeCategory]
  );

  const handleAssignCategory = useCallback(
    async (todoId, categoryId) => {
      if (!todoId || !categoryId) {
        return;
      }
      const todo = todos.find(t => t.id === todoId);
      if (!todo) return;

      const currentCategories = Array.isArray(todo.categories)
        ? todo.categories
        : [];
      if (currentCategories.includes(categoryId)) {
        return;
      }
      
      await updateTodo(todoId, { categories: [...currentCategories, categoryId] });
    },
    [todos, updateTodo]
  );

  const archiveCompleted = useCallback(async () => {
    const completedTodos = todos.filter(
      (todo) => todo.status === "completed" || todo.completed
    );

    if (completedTodos.length === 0) {
      return;
    }

    const updates = completedTodos.map(todo => 
      updateTodo(todo.id, { archivedAt: new Date().toISOString() })
    );
    
    await Promise.all(updates);
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
    [priorityFocus]
  );

  const filteredTodos = useMemo(() => {
    const list = todos.filter(FILTERS[filter]);
    return reorderByPriorityFocus(list);
  }, [todos, filter, reorderByPriorityFocus]);

  const boardColumns = useMemo(
    () =>
      CARD_COLUMNS.map(({ key, label }) => ({
        key,
        label,
        todos: reorderByPriorityFocus(todos.filter(FILTERS[key]))
      })),
    [todos, reorderByPriorityFocus]
  );

  const sortedArchivedTodos = useMemo(() => {
    if (archivedTodos.length === 0) {
      return [];
    }
    return [...archivedTodos].sort((a, b) => {
      const aTime = new Date(a.archivedAt ?? a.completedAt ?? a.createdAt).getTime();
      const bTime = new Date(b.archivedAt ?? b.completedAt ?? b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [archivedTodos]);

  const listDragAndDrop = useListDragAndDrop({
    isEnabled: isListView,
    todos: filteredTodos,
    setTodos
  });

  const boardDragAndDrop = useBoardDragAndDrop({
    isEnabled: isCardView,
    columns: CARD_COLUMNS,
    setTodos: (fn) => setTodos(fn(todos))
  });

  const dueDateHighlights = useMemo(() => {
    const priorityOrder = new Map(
      TODO_PRIORITIES.map((priority, index) => [priority, index])
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
            (priorityOrder.get(b) ?? Number.POSITIVE_INFINITY)
        );
        return [iso, { count: ordered.length, priorities: ordered }];
      })
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
      if (!dueDate) {
        setComposerError("pick a due date before adding the task.");
        return;
      }

      const nextTodo = {
        title: title.trim(),
        description: description.trim(),
        priority: DEFAULT_PRIORITY,
        status: "backlog",
        is_complete: false,
        due_date: dueDate ? dueDate.trim() : null,
        categories: [...selectedCategories]
      };

      const result = await addTodo(nextTodo);
      if (!result?.success || !result?.todo) {
        setComposerError(
          result?.error?.message ||
            "unable to save that task right now. please try again."
        );
        return;
      }
      
      setTitle("");
      setDescription("");
      setDueDate("");
      setSelectedCategories([]);
      setComposerError("");
    },
    [title, description, dueDate, addTodo, selectedCategories]
  );

  const updateTodoStatus = useCallback(
    async (id, status) => {
      const timestamp = new Date().toISOString();
      const todo = todos.find(t => t.id === id);
      if (!todo) return;

      const updates = {
        status,
        is_complete: status === "completed",
        activatedAt:
          status === "active"
            ? todo.activatedAt ?? timestamp
            : status === "completed"
            ? todo.activatedAt ?? timestamp
            : null,
        completedAt: status === "completed" ? timestamp : null
      };
      
      await updateTodo(id, updates);
    },
    [todos, updateTodo]
  );

  const toggleTodo = useCallback(
    (id, checked) => {
      updateTodoStatus(id, checked ? "completed" : "active");
    },
    [updateTodoStatus]
  );

  const moveToBacklog = useCallback(
    (id) => {
      updateTodoStatus(id, "backlog");
    },
    [updateTodoStatus]
  );

  const moveToActive = useCallback(
    (id) => {
      updateTodoStatus(id, "active");
    },
    [updateTodoStatus]
  );

  const updateTodoPriority = useCallback(
    async (id, value) => {
      if (!TODO_PRIORITIES.includes(value)) {
        return;
      }
      await updateTodo(id, { priority: value });
    },
    [updateTodo]
  );

  const removeTodo = useCallback(
    async (id) => {
      await deleteTodo(id);
    },
    [deleteTodo]
  );

  const handleDismiss = useCallback(
    (todo) => {
      if (todo.status === "active") {
        moveToBacklog(todo.id);
        return;
      }
      removeTodo(todo.id);
    },
    [moveToBacklog, removeTodo]
  );

  const removeArchivedTodo = useCallback(
    async (id) => {
      await deleteTodo(id);
    },
    [deleteTodo]
  );

  const handleRemoveCategoryFromTodo = useCallback(
    async (todoId, categoryId) => {
      if (!todoId || !categoryId) {
        return;
      }
      const todo = todos.find(t => t.id === todoId);
      if (!todo || !Array.isArray(todo.categories)) return;

      const nextCategories = todo.categories.filter((category) => category !== categoryId);
      await updateTodo(todoId, { categories: nextCategories });
    },
    [todos, updateTodo]
  );

  const handleRemoveCategoryFromArchived = useCallback(
    async (todoId, categoryId) => {
      // This will be handled by the real-time subscription or a full state refresh
    },
    []
  );

  const restoreArchivedTodo = useCallback(
    async (todoId) => {
      if (!todoId) {
        return;
      }
      await updateTodo(todoId, { archivedAt: null });
    },
    [updateTodo]
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
      retryTodoSync
    }),
    [
      toggleTodo,
      moveToActive,
      updateTodoStatus,
      updateTodoPriority,
      handleDismiss,
      syncStateById,
      syncErrorById,
      retryTodoSync
    ]
  );

  const handleToggleArchive = useCallback(() => {
    setIsArchiveOpen((prev) => !prev);
  }, []);

  if (todosLoading || categoriesLoading) {
    return <div>Loading...</div>;
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
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onDueDateChange={handleDueDateChange}
        onSubmit={handleSubmit}
        dueHighlights={dueDateHighlights}
        filter={filter}
        onFilterChange={setFilter}
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
            <p className="empty-state">no todos yet. add one above.</p>
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
          <p className="empty-state">
            {filter === "active"
              ? "no tasks are active."
              : filter === "completed"
              ? "no tasks done yet."
              : "no todos yet. add one above."}
          </p>
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
        categoryLookup={categoryLookup}
        onRemoveCategory={handleRemoveCategoryFromArchived}
      />
    </main>
  );
}

export default KanbanApp;
