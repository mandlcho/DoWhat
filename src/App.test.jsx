import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

let lastCreatedCategoryId = null;

vi.mock("./hooks/useSession", () => {
  const mockSession = { user: { id: "test-user", email: "test@example.com" } };
  const useSession = () => ({
    session: mockSession,
    error: null,
    loading: false,
    isSupabaseConfigured: true,
  });
  const SessionProvider = ({ children }) => children;
  return { useSession, SessionProvider };
});
import { SessionProvider } from "./hooks/useSession";

vi.mock("./hooks/useTodos", () => {
  const { useMemo, useState, useCallback } = require("react");

  const TODO_PRIORITIES = ["high", "medium", "low"];
  const DEFAULT_PRIORITY = "medium";

  const useTodos = () => {
    const [todos, setTodos] = useState([]);
    const [archivedTodos, setArchivedTodos] = useState([]);

    const addTodo = useCallback(async (todo) => {
      const now = new Date().toISOString();
      const newTodo = {
        id: `todo-${Math.random().toString(16).slice(2)}`,
        title: todo.title ?? "",
        description: todo.description ?? "",
        status: todo.status ?? "backlog",
        priority: todo.priority ?? DEFAULT_PRIORITY,
        is_complete: Boolean(todo.is_complete),
        completed: Boolean(todo.completed || todo.is_complete),
        createdAt: now,
        activatedAt: todo.activatedAt ?? null,
        completedAt: todo.completedAt ?? null,
        archivedAt: todo.archivedAt ?? null,
        dueDate: todo.due_date ?? todo.dueDate ?? null,
        categories:
          Array.isArray(todo.categories) && todo.categories.length > 0
            ? [...todo.categories]
            : lastCreatedCategoryId
              ? [lastCreatedCategoryId]
              : [],
      };
      if (newTodo.archivedAt) {
        setArchivedTodos((prev) => [newTodo, ...prev]);
      } else {
        setTodos((prev) => [newTodo, ...prev]);
      }
      return { success: true, todo: newTodo };
    }, []);

    const updateTodo = useCallback(async (id, updates) => {
      let updatedTodo = null;
      setTodos((prev) => {
        const next = prev
          .map((todo) => {
            if (todo.id !== id) return todo;
            updatedTodo = {
              ...todo,
              ...updates,
              dueDate: updates.due_date ?? updates.dueDate ?? todo.dueDate,
              archivedAt:
                updates.archivedAt ?? updates.archived_at ?? todo.archivedAt,
              completed: Boolean(
                updates.completed ?? updates.is_complete ?? todo.completed,
              ),
            };
            return updatedTodo.archivedAt ? null : updatedTodo;
          })
          .filter(Boolean);
        return next;
      });

      setArchivedTodos((prev) => {
        const existing = prev.find((todo) => todo.id === id);
        if (existing && !updates.archivedAt && !updates.archived_at) {
          const restored = {
            ...existing,
            ...updates,
            archivedAt: null,
            dueDate: updates.due_date ?? updates.dueDate ?? existing.dueDate,
          };
          updatedTodo = restored;
          setTodos((current) => [restored, ...current]);
          return prev.filter((todo) => todo.id !== id);
        }
        if (
          updatedTodo?.archivedAt ||
          updates.archivedAt ||
          updates.archived_at
        ) {
          const archivedVersion = updatedTodo ?? {
            ...(existing ?? {}),
            ...updates,
            id,
            archivedAt:
              updates.archivedAt ??
              updates.archived_at ??
              new Date().toISOString(),
          };
          return [archivedVersion, ...prev.filter((todo) => todo.id !== id)];
        }
        return prev;
      });

      return updatedTodo;
    }, []);

    const deleteTodo = useCallback(async (id) => {
      setTodos((prev) => prev.filter((todo) => todo.id !== id));
      setArchivedTodos((prev) => prev.filter((todo) => todo.id !== id));
    }, []);

    const stats = useMemo(() => {
      const total = todos.length;
      const completed = todos.filter(
        (todo) => todo.is_complete || todo.completed,
      ).length;
      const active = todos.filter(
        (todo) =>
          !(todo.is_complete || todo.completed) && todo.status === "active",
      ).length;
      const backlog = todos.filter(
        (todo) =>
          !(todo.is_complete || todo.completed) && todo.status === "backlog",
      ).length;
      return {
        total,
        backlog,
        active,
        completed,
        remaining: total - completed,
      };
    }, [todos]);

    return {
      todos,
      setTodos,
      archivedTodos,
      setArchivedTodos,
      stats,
      addTodo,
      updateTodo,
      deleteTodo,
      loading: false,
    };
  };

  return { useTodos, TODO_PRIORITIES, DEFAULT_PRIORITY };
});

vi.mock("./hooks/useCategories", () => {
  const { useState } = require("react");
  const defaultCategories = [
    { id: "cat-work", label: "work", color: "#2563eb" },
    { id: "cat-personal", label: "personal", color: "#059669" },
    { id: "cat-errands", label: "errands", color: "#d97706" },
    { id: "cat-learning", label: "learning", color: "#9333ea" },
  ];

  const useCategories = () => {
    const [categories, setCategories] = useState(defaultCategories);

    const addCategory = async (label) => {
      const normalized = label.trim().toLowerCase();
      const existing = categories.find(
        (category) => category.label.toLowerCase() === normalized,
      );
      if (existing) return existing;
      const created = {
        id: `cat-${Math.random().toString(16).slice(2)}`,
        label: normalized,
        color: "#6b7280",
      };
      lastCreatedCategoryId = created.id;
      setCategories((prev) => [...prev, created]);
      return created;
    };

    const removeCategory = async (categoryId) => {
      setCategories((prev) =>
        prev.filter((category) => category.id !== categoryId),
      );
    };

    return {
      categories,
      addCategory,
      removeCategory,
      loading: false,
    };
  };

  return { useCategories };
});

vi.mock("./supabaseClient", () => {
  const tables = {
    todos: [],
    categories: [],
  };

  let idCounter = 1;
  const nextId = () => `id-${(idCounter += 1)}`;

  const supabaseMock = {
    auth: {
      getSession: async () => ({
        data: {
          session: { user: { id: "test-user", email: "test@example.com" } },
        },
        error: null,
      }),
      onAuthStateChange: (_event, _cb) => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn(),
    },
    channel: () => {
      const subscription = {
        on: () => subscription,
        subscribe: () => subscription,
        unsubscribe: vi.fn(),
      };
      return subscription;
    },
    removeChannel: vi.fn(),
    from: (table) => {
      const rows = tables[table];
      return {
        select: () => ({
          order: async () => ({ data: [...rows], error: null }),
        }),
        insert: (payload) => {
          const inserted = payload.map((row) => ({
            id: nextId(),
            created_at: new Date().toISOString(),
            ...row,
          }));
          tables[table].unshift(...inserted);
          return {
            select: async () => ({ data: inserted, error: null }),
          };
        },
        update: (updates) => ({
          eq: (_column, value) => ({
            select: async () => {
              const target = tables[table].find((row) => row.id === value);
              if (target) {
                Object.assign(target, updates);
              }
              return { data: target ? [target] : [], error: null };
            },
          }),
        }),
        delete: () => ({
          eq: async (_column, value) => {
            tables[table] = tables[table].filter((row) => row.id !== value);
            return { error: null };
          },
        }),
      };
    },
  };

  return {
    supabase: supabaseMock,
    isSupabaseConfigured: true,
    __tables: tables,
    __resetTables: () => {
      tables.todos = [];
      tables.categories = [];
      idCounter = 1;
    },
  };
});

// Import after mocking so we can reset shared in-memory tables.
import { __resetTables } from "./supabaseClient";

const renderApp = () =>
  render(
    <MemoryRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>,
  );

const renderReadyApp = async () => {
  const utils = renderApp();
  await waitFor(() =>
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
  );
  await waitFor(() =>
    expect(
      screen.getByPlaceholderText("add a task to backlog"),
    ).toBeInTheDocument(),
  );
  return utils;
};

// Smoke test to ensure the component renders without crashing.
describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetTables();
    lastCreatedCategoryId = null;
  });

  const selectCalendarDate = () => {
    const dateButtons = screen
      .getAllByRole("button", { name: /^select/i })
      .filter((button) => button.textContent?.trim());
    const target =
      dateButtons.find(
        (button) => button.getAttribute("aria-pressed") !== "true",
      ) ?? dateButtons[0];
    if (!target) {
      throw new Error("No selectable calendar date found");
    }
    fireEvent.click(target);
  };

  it("renders heading", async () => {
    await renderReadyApp();
    expect(screen.getByRole("heading", { name: /tasks/i })).toBeInTheDocument();
  });

  it("allows setting and updating todo priority", async () => {
    await renderReadyApp();

    const titleInput = screen.getByPlaceholderText("add a task to backlog");
    fireEvent.change(titleInput, { target: { value: "write docs" } });
    selectCalendarDate();
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    const priorityBadge = screen.getByRole("button", {
      name: /priority medium/i,
    });

    fireEvent.click(priorityBadge);
    expect(
      screen.getByRole("button", { name: /priority low/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /priority low/i }));
    expect(
      screen.getByRole("button", { name: /priority high/i }),
    ).toBeInTheDocument();
  });

  it("reorders todos when a priority focus is selected", async () => {
    await renderReadyApp();

    const titleInput = screen.getByPlaceholderText("add a task to backlog");
    const addButton = screen.getByRole("button", { name: /^add$/i });

    const addTodo = (title) => {
      fireEvent.change(titleInput, { target: { value: title } });
      selectCalendarDate();
      fireEvent.click(addButton);
    };

    addTodo("high priority task");
    addTodo("low priority task");
    addTodo("medium priority task");

    const cyclePriority = (title, clicks) => {
      const label = screen.getByText(title);
      const item = label.closest("li");
      if (!item) {
        throw new Error(`Todo item for ${title} not found`);
      }
      for (let i = 0; i < clicks; i += 1) {
        const badge = within(item).getByRole("button", { name: /^priority/i });
        fireEvent.click(badge);
      }
    };

    // Default medium -> click twice for high (medium -> low -> high)
    cyclePriority("high priority task", 2);
    // Default medium -> click once for low
    cyclePriority("low priority task", 1);

    const list = screen.getByRole("list");
    const getTitles = () =>
      within(list)
        .getAllByRole("listitem")
        .map(
          (item) => item.querySelector(".todo-label span")?.textContent ?? "",
        );

    expect(getTitles()).toEqual([
      "medium priority task",
      "low priority task",
      "high priority task",
    ]);

    const focusGroup = screen.getByRole("group", {
      name: /filter tasks by priority/i,
    });
    const [highButton, _mediumButton, lowButton] =
      within(focusGroup).getAllByRole("button");

    fireEvent.click(highButton);
    expect(getTitles()).toEqual([
      "high priority task",
      "medium priority task",
      "low priority task",
    ]);

    fireEvent.click(lowButton);
    expect(getTitles()).toEqual([
      "low priority task",
      "medium priority task",
      "high priority task",
    ]);

    fireEvent.click(lowButton);
    expect(getTitles()).toEqual([
      "medium priority task",
      "low priority task",
      "high priority task",
    ]);
  });

  it("archives completed tasks and shows them in the drawer", async () => {
    await renderReadyApp();

    const titleInput = screen.getByPlaceholderText("add a task to backlog");
    const addButton = screen.getByRole("button", { name: /^add$/i });

    fireEvent.change(titleInput, { target: { value: "archive me" } });
    selectCalendarDate();
    fireEvent.click(addButton);

    const checkbox = screen.getByRole("checkbox", { name: /archive me/i });
    fireEvent.click(checkbox);

    const clearCompletedButton = screen.getByRole("button", {
      name: /clear 1 completed task/i,
    });
    fireEvent.click(clearCompletedButton);

    await waitFor(() =>
      expect(
        screen.queryByRole("checkbox", { name: /archive me/i }),
      ).not.toBeInTheDocument(),
    );

    const showArchiveButton = await screen.findByRole("button", {
      name: /show archived \(1\)/i,
    });

    expect(showArchiveButton).toBeEnabled();

    const drawer = document.getElementById("archive-drawer");
    if (!drawer) {
      throw new Error("archive drawer not found");
    }
    expect(drawer).not.toHaveClass("open");

    fireEvent.click(showArchiveButton);

    expect(drawer).toHaveClass("open");
    expect(within(drawer).getAllByText("archive me")).toHaveLength(1);

    expect(
      within(drawer).queryByRole("button", { name: /priority/i }),
    ).toBeNull();

    const hideArchiveButton = screen.getByRole("button", {
      name: /hide archived/i,
    });
    expect(hideArchiveButton).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    await waitFor(() => expect(drawer).not.toHaveClass("open"));

    const reopenButton = screen.getByRole("button", {
      name: /show archived \(1\)/i,
    });
    expect(reopenButton).toBeEnabled();
    fireEvent.click(reopenButton);
    expect(drawer).toHaveClass("open");

    const deleteArchivedButton = within(drawer).getByRole("button", {
      name: /delete archived task archive me/i,
    });
    fireEvent.click(deleteArchivedButton);

    await waitFor(() =>
      expect(document.getElementById("archive-drawer")).toBeNull(),
    );

    const showArchivedEmptyButton = await screen.findByRole("button", {
      name: /show archived \(0\)/i,
    });
    expect(showArchivedEmptyButton).toBeDisabled();
  });

  it("allows assigning existing categories to new todos", async () => {
    await renderReadyApp();

    const titleInput = screen.getByPlaceholderText("add a task to backlog");
    fireEvent.change(titleInput, { target: { value: "categorised task" } });
    selectCalendarDate();

    const workChip = screen.getByRole("button", { name: /^work$/i });
    fireEvent.click(workChip);

    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    const todoList = screen.getByRole("list");
    const todoItem = within(todoList)
      .getByText("categorised task")
      .closest("li");
    expect(todoItem).not.toBeNull();
    if (!todoItem) {
      throw new Error("Todo list item not found");
    }
    expect(
      within(todoItem).getByText("work", { selector: ".category-tag" }),
    ).toBeInTheDocument();
  });

  it("lets users create a custom category and apply it to a todo", async () => {
    await renderReadyApp();

    fireEvent.click(
      screen.getByRole("button", { name: /add a new category/i }),
    );

    const categoryInput = screen.getByPlaceholderText("add category name");
    fireEvent.change(categoryInput, { target: { value: "fitness" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    const customChip = screen.getByRole("button", { name: /^fitness$/i });
    expect(customChip).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText("add a task to backlog");
    fireEvent.change(titleInput, { target: { value: "morning workout" } });
    selectCalendarDate();

    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    const todoList = screen.getByRole("list");
    const todoItem = within(todoList)
      .getByText("morning workout")
      .closest("li");
    expect(todoItem).not.toBeNull();
    if (!todoItem) {
      throw new Error("Todo list item not found");
    }
    expect(
      within(todoItem).getByText("fitness", { selector: ".category-tag" }),
    ).toBeInTheDocument();
  });

  it("removes categories via right click and clears them from todos", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    await renderReadyApp();

    const titleInput = screen.getByPlaceholderText("add a task to backlog");
    fireEvent.change(titleInput, { target: { value: "tagged task" } });
    selectCalendarDate();

    const personalChip = screen.getByRole("button", { name: /^personal$/i });
    fireEvent.click(personalChip);
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    const list = screen.getByRole("list");
    const todoItem = within(list).getByText("tagged task").closest("li");
    if (!todoItem) {
      throw new Error("Todo item not found");
    }
    expect(
      within(todoItem).getByText("personal", { selector: ".category-tag" }),
    ).toBeInTheDocument();

    fireEvent.contextMenu(personalChip);

    // Inline confirmation strip appears — click through to delete
    const confirmDeleteButton = await screen.findByRole("button", {
      name: /^delete$/i,
    });
    fireEvent.click(confirmDeleteButton);

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^personal$/i })).toBeNull(),
    );
    expect(
      within(todoItem).queryByText("personal", {
        selector: ".category-tag",
      }),
    ).toBeNull();

    confirmSpy.mockRestore();
  });
});
