import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useSession } from "./useSession";

export const TODO_PRIORITIES = ["high", "medium", "low"];
export const DEFAULT_PRIORITY = "medium";
const createId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Math.random().toString(16).slice(2)}`);
const isTempId = (id) => typeof id === "string" && id.startsWith("tmp-");

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
const prepareDbPayload = (todo, { includeCategories = true } = {}) => {
  const mapped = mapTodoToDatabase(todo);
  if (!includeCategories) {
    delete mapped.categories;
  }
  return mapped;
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
  const [syncStateById, setSyncStateById] = useState(new Map());
  const [syncErrorById, setSyncErrorById] = useState(new Map());
  const [supportsCategories, setSupportsCategories] = useState(true);
  const user = session?.user;

  const refreshTodos = useCallback(async () => {
    if (!user) {
      setTodos([]);
      setArchivedTodos([]);
      setLoading(false);
      setSyncStateById(new Map());
      setSyncErrorById(new Map());
      return { data: [], error: null };
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching todos:", error);
      setLoading(false);
      return { data: [], error };
    }

    const mapped = (data ?? []).map(mapTodoFromDatabase).filter(Boolean);
    const { active, archived } = splitTodosByArchive(mapped);
    setTodos(active);
    setArchivedTodos(archived);
    setSyncStateById((prev) => {
      const next = new Map(prev);
      mapped.forEach((todo) => next.set(todo.id, "synced"));
      return next;
    });
    setSyncErrorById(new Map());
    setLoading(false);
    return { data: mapped, error: null };
  }, [user]);

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

    refreshTodos();

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
  }, [user, upsertTodoInState, removeTodoFromState, refreshTodos]);

  const addTodo = async (todo) => {
    if (!user) return { success: false, error: new Error("User not authenticated.") };

    const tempId = todo?.id ?? createId();
    const optimistic = mapTodoFromDatabase({
      id: tempId,
      ...mapTodoToDatabase(todo),
      user_id: user.id,
      created_at: new Date().toISOString(),
      archived_at: null
    });

    if (optimistic) {
      upsertTodoInState(optimistic);
      setSyncStateById((prev) => {
        const next = new Map(prev);
        next.set(tempId, "syncing");
        return next;
      });
      setSyncErrorById((prev) => {
        const next = new Map(prev);
        next.delete(tempId);
        return next;
      });
    }

    const { data, error } = await supabase
      .from("todos")
      .insert([{ ...mapTodoToDatabase(todo), user_id: user.id }])
      .select();

    if (error) {
      console.error("Error adding todo:", error);
      setSyncStateById((prev) => {
        const next = new Map(prev);
        next.set(tempId, "failed");
        return next;
      });
      setSyncErrorById((prev) => {
        const next = new Map(prev);
        next.set(tempId, error.message || "Unknown error");
        return next;
      });
      return { success: false, error };
    }

    const created = mapTodoFromDatabase(data?.[0]);
    if (created) {
      setTodos((current) => {
        const filtered = current.filter((item) => item.id !== tempId && item.id !== created.id);
        return created.archivedAt ? filtered : [created, ...filtered];
      });
      setArchivedTodos((current) => {
        const filtered = current.filter((item) => item.id !== tempId && item.id !== created.id);
        return created.archivedAt ? [created, ...filtered] : filtered;
      });
      setSyncStateById((prev) => {
        const next = new Map(prev);
        next.delete(tempId);
        next.set(created.id, "synced");
        return next;
      });
      setSyncErrorById((prev) => {
        const next = new Map(prev);
        next.delete(tempId);
        next.delete(created.id);
        return next;
      });
    }

    // Always refresh from the server to guarantee state matches what was persisted.
    const refreshed = await refreshTodos();
    if (refreshed.error) {
      return { success: false, error: refreshed.error };
    }

    const newId = created?.id ?? data?.[0]?.id;
    const matched = refreshed.data.find((item) => item.id === newId) ?? created;
    if (matched) {
      setSyncStateById((prev) => {
        const next = new Map(prev);
        next.set(matched.id, "synced");
        return next;
      });
      setSyncErrorById((prev) => {
        const next = new Map(prev);
        next.delete(matched.id);
        return next;
      });
      return { success: true, todo: matched };
    }

    setSyncStateById((prev) => {
      const next = new Map(prev);
      if (newId) {
        next.set(newId, "failed");
      }
      return next;
    });
    setSyncErrorById((prev) => {
      const next = new Map(prev);
      if (newId) {
        next.set(newId, "Unable to confirm the new task was saved.");
      }
      return next;
    });
    return { success: false, error: new Error("Unable to confirm the new task was saved.") };
  };

  const retryTodoSync = async (id) => {
    if (!user || !id) return { success: false, error: new Error("Missing todo id.") };

    const syncState = syncStateById.get(id);
    if (syncState !== "failed") {
      return { success: false, error: new Error("Nothing to retry.") };
    }

    const allTodos = [...todos, ...archivedTodos];
    const todo = allTodos.find((item) => item.id === id);
    if (!todo) {
      return { success: false, error: new Error("Todo not found in state.") };
    }

    setSyncStateById((prev) => {
      const next = new Map(prev);
      next.set(id, "syncing");
      return next;
    });
    setSyncErrorById((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    if (isTempId(todo.id)) {
      const attemptInsert = async (allowCategories) => {
        const payload = {
          ...prepareDbPayload(todo, { includeCategories: allowCategories }),
          user_id: user.id
        };
        return supabase.from("todos").insert([payload]).select();
      };

      let data;
      let error;
      ({ data, error } = await attemptInsert(supportsCategories));

      if (error && supportsCategories) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("categories") && msg.includes("column")) {
          setSupportsCategories(false);
          ({ data, error } = await attemptInsert(false));
        }
      }

      if (error) {
        console.error("Error retrying todo insert:", error);
        setSyncStateById((prev) => {
          const next = new Map(prev);
          next.set(id, "failed");
          return next;
        });
        setSyncErrorById((prev) => {
          const next = new Map(prev);
          next.set(id, error.message || "Unknown error");
          return next;
        });
        return { success: false, error };
      }

      const created = mapTodoFromDatabase(data?.[0]);
      if (created) {
        setTodos((current) => {
          const filtered = current.filter((item) => item.id !== id && item.id !== created.id);
          return created.archivedAt ? filtered : [created, ...filtered];
        });
        setArchivedTodos((current) => {
          const filtered = current.filter((item) => item.id !== id && item.id !== created.id);
          return created.archivedAt ? [created, ...filtered] : filtered;
        });
        setSyncStateById((prev) => {
          const next = new Map(prev);
          next.delete(id);
          next.set(created.id, "synced");
          return next;
        });
        setSyncErrorById((prev) => {
          const next = new Map(prev);
          next.delete(id);
          next.delete(created.id);
          return next;
        });
        return { success: true, todo: created };
      }
    }

    const attemptUpdate = async (allowCategories) =>
      supabase
        .from("todos")
        .update(prepareDbPayload(todo, { includeCategories: allowCategories }))
        .eq("id", id)
        .select();

    let data;
    let error;
    ({ data, error } = await attemptUpdate(supportsCategories));

    if (error && supportsCategories) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("categories") && msg.includes("column")) {
        setSupportsCategories(false);
        ({ data, error } = await attemptUpdate(false));
      }
    }

    if (error) {
      console.error("Error retrying todo update:", error);
      setSyncStateById((prev) => {
        const next = new Map(prev);
        next.set(id, "failed");
        return next;
      });
      setSyncErrorById((prev) => {
        const next = new Map(prev);
        next.set(id, error.message || "Unknown error");
        return next;
      });
      return { success: false, error };
    }

    const updated = mapTodoFromDatabase(data?.[0]);
    if (updated) {
      upsertTodoInState(updated);
      setSyncStateById((prev) => {
        const next = new Map(prev);
        next.set(updated.id, "synced");
        return next;
      });
      setSyncErrorById((prev) => {
        const next = new Map(prev);
        next.delete(updated.id);
        return next;
      });
      return { success: true, todo: updated };
    }

    return { success: false, error: new Error("Unable to retry sync.") };
  };

  const updateTodo = async (id, updates) => {
    if (!user || !id) return null;

    setSyncStateById((prev) => {
      const next = new Map(prev);
      next.set(id, "syncing");
      return next;
    });
    setSyncErrorById((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    const attemptUpdate = async (allowCategories) =>
      supabase
        .from("todos")
        .update(prepareDbPayload(updates, { includeCategories: allowCategories }))
        .eq("id", id)
        .select();

    let data;
    let error;
    ({ data, error } = await attemptUpdate(supportsCategories));

    if (error && supportsCategories) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("categories") && msg.includes("column")) {
        setSupportsCategories(false);
        ({ data, error } = await attemptUpdate(false));
      }
    }

    if (error) {
      console.error("Error updating todo:", error);
      setSyncStateById((prev) => {
        const next = new Map(prev);
        next.set(id, "failed");
        return next;
      });
      setSyncErrorById((prev) => {
        const next = new Map(prev);
        next.set(id, error.message || "Unknown error");
        return next;
      });
      return null;
    }

    const updated = mapTodoFromDatabase(data?.[0]);
    if (updated) {
      upsertTodoInState(updated);
      setSyncStateById((prev) => {
        const next = new Map(prev);
        next.set(updated.id, "synced");
        return next;
      });
      setSyncErrorById((prev) => {
        const next = new Map(prev);
        next.delete(updated.id);
        return next;
      });
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
    syncStateById,
    syncErrorById,
    stats,
    addTodo,
    updateTodo,
    retryTodoSync,
    deleteTodo,
    loading
  };
}
