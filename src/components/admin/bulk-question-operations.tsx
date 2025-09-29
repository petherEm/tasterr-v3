"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckSquare,
  Square,
  MoreVertical,
  Copy,
  Trash2,
  Bot,
  Eye,
  EyeOff,
} from "lucide-react";

interface BulkOperationsProps {
  selectedQuestions: number[];
  totalQuestions: number;
  categories: Array<{ name: string; color?: string }>;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onMoveToCategory: (
    questionIndices: number[],
    categoryId: string | null
  ) => void;
  onDuplicateQuestions: (questionIndices: number[]) => void;
  onDeleteQuestions: (questionIndices: number[]) => void;
  onToggleAI: (questionIndices: number[], enabled: boolean) => void;
  onToggleRequired: (questionIndices: number[], required: boolean) => void;
  onToggleCollapse: (questionIndices: number[], collapsed: boolean) => void;
}

export function BulkQuestionOperations({
  selectedQuestions,
  totalQuestions,
  categories,
  onSelectAll,
  onClearSelection,
  onMoveToCategory,
  onDuplicateQuestions,
  onDeleteQuestions,
  onToggleAI,
  onToggleRequired,
  onToggleCollapse,
}: BulkOperationsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [moveToCategory, setMoveToCategory] = useState<string>("");

  const hasSelection = selectedQuestions.length > 0;
  const isAllSelected =
    selectedQuestions.length === totalQuestions && totalQuestions > 0;
  const isPartiallySelected = hasSelection && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onClearSelection();
    } else {
      onSelectAll();
    }
  };

  const handleMoveToCategory = (categoryId: string | null) => {
    if (hasSelection) {
      onMoveToCategory(selectedQuestions, categoryId);
      setMoveToCategory("");
    }
  };

  const handleDelete = () => {
    onDeleteQuestions(selectedQuestions);
    setShowDeleteDialog(false);
  };

  const handleDuplicate = () => {
    onDuplicateQuestions(selectedQuestions);
  };

  if (!hasSelection) {
    return (
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-gray-200">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isAllSelected}
            ref={(el: any) => {
              if (el) el.indeterminate = isPartiallySelected;
            }}
            onCheckedChange={handleSelectAll}
            className="border-gray-300"
          />
          <span className="text-sm text-gray-600 font-medium">
            Select questions for bulk operations
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={isAllSelected}
            ref={(el: any) => {
              if (el) el.indeterminate = isPartiallySelected;
            }}
            onCheckedChange={handleSelectAll}
            className="border-blue-300"
          />
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-800 border-blue-200"
          >
            <CheckSquare className="w-3 h-3 mr-1" />
            {selectedQuestions.length} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
          >
            Clear selection
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Move to Category */}
          <Select value={moveToCategory} onValueChange={handleMoveToCategory}>
            <SelectTrigger className="w-40 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20">
              <SelectValue placeholder="Move to..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">—</span>
                  Uncategorized
                </div>
              </SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.name} value={category.name}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: category.color || "#3B82F6" }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Bulk Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-200 hover:bg-blue-50 bg-transparent"
              >
                <MoreVertical className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Questions
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onToggleRequired(selectedQuestions, true)}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Mark as Required
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onToggleRequired(selectedQuestions, false)}
              >
                <Square className="h-4 w-4 mr-2" />
                Mark as Optional
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onToggleAI(selectedQuestions, true)}
              >
                <Bot className="h-4 w-4 mr-2" />
                Enable AI Assistance
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onToggleAI(selectedQuestions, false)}
              >
                <Bot className="h-4 w-4 mr-2 opacity-50" />
                Disable AI Assistance
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onToggleCollapse(selectedQuestions, true)}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Collapse All
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onToggleCollapse(selectedQuestions, false)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Expand All
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Questions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Questions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedQuestions.length}{" "}
              question
              {selectedQuestions.length !== 1 ? "s" : ""}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectedQuestions.length} Question
              {selectedQuestions.length !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
