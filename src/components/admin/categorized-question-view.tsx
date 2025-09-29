"use client";

import type React from "react";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  GripVertical,
  MoreVertical,
  Edit3,
  Trash2,
  Move,
  Eye,
  EyeOff,
  Bot,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
} from "lucide-react";

interface Question {
  question_text: string;
  question_subtitle?: string;
  question_type: string;
  is_required: boolean;
  order_index: number;
  category_id?: string;
  ai_assistance_enabled: boolean;
  ai_assistance_config?: any;
  options?: any;
}

interface Category {
  name: string;
  description?: string;
  order_index: number;
  color?: string;
  icon?: string;
}

interface CategorizedQuestionViewProps {
  questions: Question[];
  categories: Category[];
  onAddQuestion: (categoryId?: string) => void;
  onEditQuestion: (questionIndex: number) => void;
  onDeleteQuestion: (questionIndex: number) => void;
  onMoveQuestion: (questionIndex: number, toCategoryId?: string) => void;
  onReorderQuestions: (fromIndex: number, toIndex: number) => void;
  collapsedQuestions: Record<number, boolean>;
  onToggleCollapse: (questionIndex: number) => void;
  selectedQuestions?: number[];
  onToggleSelection?: (questionIndex: number) => void;
  bulkOperationsEnabled?: boolean;
}

export function CategorizedQuestionView({
  questions,
  categories,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onMoveQuestion,
  onReorderQuestions,
  collapsedQuestions,
  onToggleCollapse,
  selectedQuestions = [],
  onToggleSelection,
  bulkOperationsEnabled = false,
}: CategorizedQuestionViewProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<number | null>(null);
  const [draggedQuestion, setDraggedQuestion] = useState<number | null>(null);

  // Group questions by category
  const categorizedQuestions = categories.reduce((acc, category) => {
    acc[category.name] = questions.filter(
      (q) => q.category_id === category.name
    );
    return acc;
  }, {} as Record<string, Question[]>);

  // Uncategorized questions
  const uncategorizedQuestions = questions.filter((q) => !q.category_id);

  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleDeleteQuestion = (questionIndex: number) => {
    setQuestionToDelete(questionIndex);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (questionToDelete !== null) {
      onDeleteQuestion(questionToDelete);
      setQuestionToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const getQuestionTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      input: "📝",
      textarea: "📄",
      number: "🔢",
      select: "📋",
      radio: "🔘",
      image_sort: "🖼️",
      image_select: "🖼️",
      image_comment: "💭",
      image_upload_comment: "📸",
      video_upload: "🎥",
      video_question: "📹",
      range: "📊",
    };
    return icons[type] || "❓";
  };

  const handleDragStart = (questionIndex: number) => (e: React.DragEvent) => {
    setDraggedQuestion(questionIndex);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedQuestion(null);
  };

  const handleCategoryDrop =
    (categoryId: string | null) => (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedQuestion !== null) {
        onMoveQuestion(draggedQuestion, categoryId || undefined);
      }
      setDraggedQuestion(null);
    };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const renderQuestion = (
    question: Question,
    questionIndex: number,
    globalIndex: number
  ) => {
    const isCollapsed = collapsedQuestions[globalIndex];
    const isDragging = draggedQuestion === globalIndex;
    const isSelected = selectedQuestions.includes(globalIndex);

    return (
      <div
        key={globalIndex}
        className={`border rounded-lg transition-all ${
          isDragging ? "opacity-50 shadow-lg" : "hover:shadow-md"
        } ${isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
        draggable
        onDragStart={handleDragStart(globalIndex)}
        onDragEnd={handleDragEnd}
      >
        {/* Question Header */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
          {bulkOperationsEnabled && onToggleSelection && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(globalIndex)}
              className="h-4 w-4"
            />
          )}

          <Button
            variant="ghost"
            size="sm"
            className="cursor-grab active:cursor-grabbing p-1 h-8 w-8"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleCollapse(globalIndex)}
            className="p-1 h-8 w-8"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {getQuestionTypeIcon(question.question_type)}
              </span>
              <span className="font-medium text-gray-900 truncate">
                {question.question_text || `Pytanie ${questionIndex + 1}`}
              </span>
              {question.is_required && (
                <Badge variant="destructive" className="text-xs">
                  Wymagane
                </Badge>
              )}
              {question.ai_assistance_enabled && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-blue-100 text-blue-700"
                >
                  <Bot className="w-3 h-3 mr-1" />
                  AI
                </Badge>
              )}
            </div>
            {question.question_subtitle && (
              <p className="text-sm text-gray-600 truncate mt-1">
                {question.question_subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {question.question_type.replace("_", " ")}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-1">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditQuestion(globalIndex)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edytuj Pytanie
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleCollapse(globalIndex)}>
                  {isCollapsed ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Pokaż Szczegóły
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Ukryj Szczegóły
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <DropdownMenuItem>
                      <Move className="h-4 w-4 mr-2" />
                      Przenieś do Kategorii
                    </DropdownMenuItem>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right">
                    {categories.map((category) => (
                      <DropdownMenuItem
                        key={category.name}
                        onClick={() =>
                          onMoveQuestion(globalIndex, category.name)
                        }
                      >
                        <div
                          className="w-3 h-3 rounded mr-2"
                          style={{
                            backgroundColor: category.color || "#3B82F6",
                          }}
                        />
                        {category.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                      onClick={() => onMoveQuestion(globalIndex, undefined)}
                    >
                      <span className="text-gray-400 mr-2">—</span>
                      Bez Kategorii
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenuItem
                  onClick={() => handleDeleteQuestion(globalIndex)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń Pytanie
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Question Details (when expanded) */}
        {!isCollapsed && (
          <div className="p-4 space-y-3">
            <div className="text-sm text-gray-700">
              <strong>Typ:</strong> {question.question_type.replace("_", " ")}
            </div>
            {question.question_subtitle && (
              <div className="text-sm text-gray-700">
                <strong>Podtytuł:</strong> {question.question_subtitle}
              </div>
            )}
            <div className="flex items-center gap-4 text-sm">
              <span
                className={
                  question.is_required ? "text-red-600" : "text-gray-600"
                }
              >
                {question.is_required ? "Wymagane" : "Opcjonalne"}
              </span>
              {question.ai_assistance_enabled && (
                <span className="text-blue-600 flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  Wspomagane AI
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCategorySection = (category: Category, questions: Question[]) => {
    const isCollapsed = collapsedCategories[category.name];
    const IconComponent = isCollapsed ? Folder : FolderOpen;

    return (
      <Card key={category.name} className="overflow-hidden">
        <CardHeader
          className="pb-3 cursor-pointer"
          onClick={() => toggleCategoryCollapse(category.name)}
          onDrop={handleCategoryDrop(category.name)}
          onDragOver={handleDragOver}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-white"
                style={{ backgroundColor: category.color || "#3B82F6" }}
              >
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  {category.name}
                  <Badge variant="secondary" className="text-xs">
                    {questions.length}{" "}
                    {questions.length === 1 ? "pytanie" : "pytań"}
                  </Badge>
                </CardTitle>
                {category.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {category.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddQuestion(category.name);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Dodaj Pytanie
              </Button>
              <Button variant="ghost" size="sm">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="pt-0">
            {questions.length === 0 ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
                onDrop={handleCategoryDrop(category.name)}
                onDragOver={handleDragOver}
              >
                <p className="text-gray-500 text-sm">
                  Brak pytań w tej kategorii.
                  <br />
                  Przeciągnij pytania tutaj lub kliknij &quot;Dodaj
                  Pytanie&quot; aby rozpocząć.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question, questionIndex) => {
                  const globalIndex = questions.indexOf(question);
                  return renderQuestion(question, questionIndex, globalIndex);
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Categories */}
      {categories.map((category) => {
        const categoryQuestions = categorizedQuestions[category.name] || [];
        return renderCategorySection(category, categoryQuestions);
      })}

      {/* Uncategorized Questions */}
      {uncategorizedQuestions.length > 0 && (
        <Card className="border-gray-300">
          <CardHeader
            className="pb-3"
            onDrop={handleCategoryDrop(null)}
            onDragOver={handleDragOver}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gray-400 flex items-center justify-center text-white">
                  <Folder className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Pytania Bez Kategorii
                    <Badge variant="outline" className="text-xs">
                      {uncategorizedQuestions.length}{" "}
                      {uncategorizedQuestions.length === 1
                        ? "pytanie"
                        : "pytań"}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Pytania nieprzypisane do żadnej kategorii
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddQuestion()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Dodaj Pytanie
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {uncategorizedQuestions.map((question, questionIndex) => {
                const globalIndex = questions.indexOf(question);
                return renderQuestion(question, questionIndex, globalIndex);
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń Pytanie</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć to pytanie? Ta akcja nie może być
              cofnięta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Usuń Pytanie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
