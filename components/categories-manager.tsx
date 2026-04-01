"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@/lib/db/schema";
import { CATEGORY_TYPES, type CategoryType } from "@/lib/constants";

interface CategoriesManagerProps {
  initialCategories: Category[];
}

export function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>(CATEGORY_TYPES[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingType, setEditingType] = useState<CategoryType | "">("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newCategoryName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim(), type: newCategoryType }),
      });

      if (response.ok) {
        const newCategory = await response.json();
        setCategories([...categories, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
        setNewCategoryName("");
        setNewCategoryType(CATEGORY_TYPES[0]);
      }
    } catch (error) {
      console.error("Failed to create category:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim(), type: editingType }),
      });

      if (response.ok) {
        const updatedCategory = await response.json();
        setCategories(
          categories
            .map((c) => (c.id === id ? updatedCategory : c))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingId(null);
        setEditingName("");
        setEditingType("");
      }
    } catch (error) {
      console.error("Failed to update category:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? This will remove it from all events and sessions.")) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCategories(categories.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingType(category.type as CategoryType);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingType("");
  };

  return (
    <div className="space-y-4">
      {/* Create new category */}
      <div className="rounded-lg border p-4 bg-muted/20">
        <div className="flex gap-2">
          <Input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreate();
              }
            }}
            placeholder="Enter new category name..."
            className="flex-1"
          />
          <select
            value={newCategoryType}
            onChange={(e) => setNewCategoryType(e.target.value as CategoryType)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
          >
            {CATEGORY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Button onClick={handleCreate} disabled={isCreating || !newCategoryName.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Categories list */}
      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/50">
          <h2 className="font-semibold">All Categories ({categories.length})</h2>
        </div>
        {categories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No categories yet. Create one above to get started.
          </div>
        ) : (
          <div className="divide-y">
            {categories.map((category) => (
              <div
                key={category.id}
                className="p-3 px-4 flex items-center gap-3 hover:bg-muted/30"
              >
                {editingId === category.id ? (
                  <>
                    <Input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdate(category.id);
                        } else if (e.key === "Escape") {
                          cancelEdit();
                        }
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <select
                      value={editingType}
                      onChange={(e) => setEditingType(e.target.value as CategoryType)}
                      className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm min-w-[160px]"
                    >
                      {CATEGORY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUpdate(category.id)}
                      disabled={!editingName.trim()}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 text-sm font-medium">{category.name}</div>
                    <Badge variant="outline" className="text-xs">
                      {category.type}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(category)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
