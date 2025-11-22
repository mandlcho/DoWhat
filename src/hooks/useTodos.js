import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useSession } from "./useSession";

export const TODO_PRIORITIES = ["high", "medium", "low"];
export const DEFAULT_PRIORITY = "medium";

const mapTodoFromDatabase = (row) => {
  if (!row) return null;

  const priority = TODO_PRIORITIES.includes(row.priority)
    ? row.priority
    : DEFAULT_PRIORITY;

  return {
    id: row.id,
    title: row.title ?? "",
    description: row.description ?? "",
    status: row.status ?? "backlog",
    priority,
    is_complete: Boolean(row.is_complete),
    completed: Boolean(row.is_complete || row.completed),
    archivedAt: row.archived_at ?? row.archivedAt ?? null,
    activatedAt: row.activated_at ?? row.activatedAt ?? null,
    completedAt: row.completed_at ?? row.completedAt ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
    dueDate: row.due_date ?? row.dueDate ?? null,
    categories: Array.isArray(row.categories)
      ? row.categories.map(String)
      : []
  };
};

const mapTodoToDatabase = (todo) => {
  if (!todo) return {};
  const mapping = {
    title: "title",
    description: "description",
    priority: "priority",
    status: "status",
    is_complete: "is_complete",
    archivedAt: "archived_at",
    archived_at: "archived_at",
    activatedAt: "activated_at",
    activated_at: "activated_at",
    completedAt: "completed_at",
    completed_at: "completed_at",
    createdAt: "created_at",
    created_at: "created_at",
    updatedAt: "updated_at",
    updated_at: "updated_at",
    dueDate: "due_date",
    due_date: "due_date",
    categories: "categories"
  };

  return Object.entries(todo).reduce((acc, [key, value]) => {
    const mappedKey = mapping[key];
    if (mappedKey) {
      acc[mappedKey] = value;
    }
    return acc;
  }, {});
};

const splitTodosByArchive = (items) => {
  const active = [];
  const archived = [];

  items.forEach((todo) => {
    if (todo?.archivedAt) {
      archived.push(todo);
    } else {
      active.push(todo);
    }
  });

  return { active, archived };
};

export function useTodos() {
  const { session } = useSession();
  const [todos, setTodos] = useState([]);
  const [archivedTodos, setArchivedTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = session?.user;

  const upsertTodoInState = useCallback((nextTodo) => {
    if (!nextTodo) return;

    setTodos((current) => {
      const filtered = current.filter((todo) => todo.id !== nextTodo.id);
      return nextTodo.archivedAt ? filtered : [nextTodo, ...filtered];
    });

    setArchivedTodos((current) => {
      const filtered = current.filter((todo) => todo.id !== nextTodo.id);
      return nextTodo.archivedAt ? [nextTodo, ...filtered] : filtered;
    });
  }, []);

  const removeTodoFromState = useCallback((id) => {
    setTodos((current) => current.filter((todo) => todo.id !== id));
    setArchivedTodos((current) => current.filter((todo) => todo.id !== id));
  }, []);

  useEffect(() => {
    if (!user) {
      setTodos([]);
      setArchivedTodos([]);
      setLoading(false);
      return undefined;
    }

    const fetchTodos = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching todos:", error);
        setLoading(false);
        return;
      }

      const mapped = (data ?? []).map(mapTodoFromDatabase).filter(Boolean);
      const { active, archived } = splitTodosByArchive(mapped);
      setTodos(active);
      setArchivedTodos(archived);
      setLoading(false);
    };

    fetchTodos();

    const subscription = supabase
      .channel("public:todos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            removeTodoFromState(payload.old.id);
            return;
          }

          const nextTodo = mapTodoFromDatabase(payload.new);
          if (!nextTodo) {
            return;
          }

          upsertTodoInState(nextTodo);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, upsertTodoInState, removeTodoFromState]);

  const addTodo = async (todo) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("todos")
      .insert([{ ...mapTodoToDatabase(todo), user_id: user.id }])
      .select();

    if (error) {
      console.error("Error adding todo:", error);
      return null;
    }

    const created = mapTodoFromDatabase(data?.[0]);
    if (created) {
      upsertTodoInState(created);
    }
    return created;
  };

  const updateTodo = async (id, updates) => {
    if (!user || !id) return null;

    const { data, error } = await supabase
      .from("todos")
      .update(mapTodoToDatabase(updates))
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating todo:", error);
      return null;
    }

    const updated = mapTodoFromDatabase(data?.[0]);
    if (updated) {
      upsertTodoInState(updated);
    }
    return updated;
  };

  const deleteTodo = async (id) => {
    if (!user || !id) return;

    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) {
      console.error("Error deleting todo:", error);
      return;
    }

    removeTodoFromState(id);
  };

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((todo) => todo.is_complete).length;
    const active = todos.filter(
      (todo) => !todo.is_complete && todo.status === "active"
    ).length;
    const backlog = todos.filter(
      (todo) => !todo.is_complete && todo.status === "backlog"
    ).length;
    return {
      total,
      backlog,
      active,
      completed,
      remaining: total - completed
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
    loading
  };
}
