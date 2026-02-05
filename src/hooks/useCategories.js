import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useSession } from "./useSession";

const DEFAULT_CATEGORIES = [
  { label: "work", color: "#2563eb" },
  { label: "personal", color: "#059669" },
  { label: "errands", color: "#d97706" },
  { label: "learning", color: "#9333ea" },
];

const mapCategoryFromDatabase = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label ?? row.name ?? "",
    color: row.color ?? "#2563eb",
  };
};

const mapCategoryToDatabase = (category, userId) => {
  if (!category?.label || !userId) {
    return null;
  }

  return {
    name: category.label.trim().toLowerCase(),
    color: category.color ?? "#2563eb",
    user_id: userId,
  };
};

export function useCategories() {
  const { session } = useSession();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = session?.user;

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      return undefined;
    }

    const fetchCategories = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        const inserts = DEFAULT_CATEGORIES.map((category) =>
          mapCategoryToDatabase(category, user.id),
        ).filter(Boolean);

        const { data: newCategories, error: insertError } = await supabase
          .from("categories")
          .insert(inserts)
          .select();

        if (insertError) {
          console.error("Error creating default categories:", insertError);
          setLoading(false);
          return;
        }

        setCategories(
          newCategories.map(mapCategoryFromDatabase).filter(Boolean),
        );
        setLoading(false);
        return;
      }

      setCategories(data.map(mapCategoryFromDatabase).filter(Boolean));
      setLoading(false);
    };

    fetchCategories();

    const subscription = supabase
      .channel("public:categories")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setCategories((currentCategories) =>
              currentCategories.filter(
                (category) => category.id !== payload.old.id,
              ),
            );
            return;
          }

          const mapped = mapCategoryFromDatabase(payload.new);
          if (!mapped) {
            return;
          }

          setCategories((currentCategories) => {
            const filtered = currentCategories.filter(
              (category) => category.id !== mapped.id,
            );
            return [...filtered, mapped].sort((a, b) =>
              a.label.localeCompare(b.label),
            );
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const addCategory = async (label, color) => {
    if (!user || !label) return null;

    const normalized = label.trim();
    const normalizedKey = normalized.toLowerCase();
    const existing = categories.find(
      (category) => category.label.toLowerCase() === normalizedKey,
    );
    if (existing) return existing;

    const dbCategory = mapCategoryToDatabase(
      { label: normalized, color: color || "#6b7280" },
      user.id,
    );

    const { data, error } = await supabase
      .from("categories")
      .insert([dbCategory])
      .select();

    if (error) {
      console.error("Error adding category:", error);
      return null;
    }

    const created = mapCategoryFromDatabase(data?.[0]);
    if (created) {
      setCategories((current) =>
        [...current, created].sort((a, b) => a.label.localeCompare(b.label)),
      );
    }
    return created;
  };

  const removeCategory = async (categoryId) => {
    if (!user || !categoryId) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      console.error("Error deleting category:", error);
    } else {
      setCategories((current) =>
        current.filter((category) => category.id !== categoryId),
      );
    }
  };

  return {
    categories,
    addCategory,
    removeCategory,
    loading,
  };
}
