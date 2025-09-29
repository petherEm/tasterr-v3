"use client";

import type React from "react";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Edit3,
  GripVertical,
  Folder,
  Users,
  TrendingUp,
  Package,
  MessageCircle,
  Phone,
  Heart,
  Star,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Nazwa kategorii jest wymagana")
    .max(100, "Nazwa kategorii za długa"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Nieprawidłowy kolor hex"),
  icon: z.string().max(50, "Nazwa ikony za długa"),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface Category {
  name: string;
  description?: string;
  order_index: number;
  color?: string;
  icon?: string;
}

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (category: Omit<Category, "order_index">) => void;
  onUpdateCategory: (index: number, category: Partial<Category>) => void;
  onDeleteCategory: (index: number) => void;
  onReorderCategories?: (fromIndex: number, toIndex: number) => void;
}

const ICON_OPTIONS = [
  { value: "folder", label: "Folder", icon: Folder },
  { value: "users", label: "Użytkownicy", icon: Users },
  { value: "trending-up", label: "Trend Wzrostowy", icon: TrendingUp },
  { value: "package", label: "Pakiet", icon: Package },
  { value: "message-circle", label: "Wiadomość", icon: MessageCircle },
  { value: "phone", label: "Telefon", icon: Phone },
  { value: "heart", label: "Serce", icon: Heart },
  { value: "star", label: "Gwiazda", icon: Star },
  { value: "check-circle", label: "Zaznaczenie", icon: CheckCircle },
  { value: "help-circle", label: "Pomoc", icon: HelpCircle },
];

const COLOR_OPTIONS = [
  { value: "#3B82F6", label: "Niebieski" },
  { value: "#10B981", label: "Szmaragdowy" },
  { value: "#F59E0B", label: "Bursztynowy" },
  { value: "#EF4444", label: "Czerwony" },
  { value: "#8B5CF6", label: "Fioletowy" },
  { value: "#06B6D4", label: "Cyjan" },
  { value: "#84CC16", label: "Limonkowy" },
  { value: "#F97316", label: "Pomarańczowy" },
  { value: "#EC4899", label: "Różowy" },
  { value: "#6366F1", label: "Indygo" },
];

export function CategoryManager({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
}: CategoryManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      icon: "folder",
    },
  });

  const openModal = (index?: number) => {
    if (index !== undefined) {
      const category = categories[index];
      setEditingIndex(index);
      form.reset({
        name: category.name,
        description: category.description || "",
        color: category.color || "#3B82F6",
        icon: category.icon || "folder",
      });
    } else {
      setEditingIndex(null);
      form.reset({
        name: "",
        description: "",
        color: "#3B82F6",
        icon: "folder",
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIndex(null);
    form.reset();
  };

  const onSubmit = (data: CategoryFormData) => {
    if (editingIndex !== null) {
      onUpdateCategory(editingIndex, data);
    } else {
      onAddCategory(data);
    }
    closeModal();
  };

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (
      draggedIndex !== null &&
      draggedIndex !== dropIndex &&
      onReorderCategories
    ) {
      onReorderCategories(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = ICON_OPTIONS.find((option) => option.value === iconName);
    return iconOption ? iconOption.icon : Folder;
  };

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-2xl blur-xl" />
        <Card className="relative bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-t-xl">
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Folder className="w-4 h-4 text-white" />
                </div>
                Kategorie Ankiety
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openModal()}
                className="border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Dodaj Kategorię
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <Folder className="w-8 h-8 text-purple-400" />
                </div>
                <p className="text-gray-500 font-medium mb-2">Brak kategorii</p>
                <p className="text-sm text-gray-400">
                  Dodaj pierwszą kategorię, aby uporządkować pytania
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category, index) => {
                  const IconComponent = getIconComponent(
                    category.icon || "folder"
                  );
                  return (
                    <div
                      key={index}
                      className={`group flex items-center gap-4 p-4 border border-gray-200 rounded-xl transition-all hover:shadow-md hover:border-gray-300 ${
                        draggedIndex === index ? "opacity-50 shadow-lg" : ""
                      }`}
                      draggable
                      onDragStart={handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver(index)}
                      onDrop={handleDrop(index)}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-grab active:cursor-grabbing p-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <GripVertical className="h-4 w-4 text-gray-400" />
                      </Button>

                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: category.color || "#3B82F6" }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">
                            {category.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs bg-gray-50 border-gray-200"
                          >
                            #{index + 1}
                          </Badge>
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {category.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal(index)}
                          className="h-8 w-8 p-1 hover:bg-blue-50 text-blue-600"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>

                        {categories.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteCategory(index)}
                            className="h-8 w-8 p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Folder className="w-4 h-4 text-white" />
              </div>
              {editingIndex !== null
                ? "Edytuj Kategorię"
                : "Dodaj Nową Kategorię"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-gray-700"
              >
                Nazwa Kategorii *
              </Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="np. Wprowadzenie, Demografia, Opinie"
                className="border-gray-200 focus:border-purple-400 focus:ring-purple-400/20"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-sm font-medium text-gray-700"
              >
                Opis (Opcjonalny)
              </Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Krótki opis tej kategorii"
                rows={2}
                className="border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Ikona
                </Label>
                <Select
                  value={form.watch("icon")}
                  onValueChange={(value) => form.setValue("icon", value)}
                >
                  <SelectTrigger className="border-gray-200 focus:border-purple-400 focus:ring-purple-400/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Kolor
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                        form.watch("color") === color.value
                          ? "border-gray-900 scale-110 shadow-md"
                          : "border-gray-300 hover:border-gray-500"
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => form.setValue("color", color.value)}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeModal}>
                Anuluj
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {editingIndex !== null
                  ? "Zaktualizuj Kategorię"
                  : "Dodaj Kategorię"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
