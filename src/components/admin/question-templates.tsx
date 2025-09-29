"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckSquare, Bot } from "lucide-react";
import {
  Layers,
  Plus,
  Users,
  TrendingUp,
  Heart,
  Star,
  Eye,
} from "lucide-react";

interface QuestionTemplate {
  question_text: string;
  question_subtitle?: string;
  question_type: string;
  is_required: boolean;
  ai_assistance_enabled: boolean;
  options?: any;
}

interface CategoryTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  questions: QuestionTemplate[];
}

interface QuestionTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (
    template: CategoryTemplate,
    targetCategoryId?: string
  ) => void;
  categories: Array<{ name: string; color?: string }>;
}

const QUESTION_TEMPLATES: CategoryTemplate[] = [
  {
    id: "demographics",
    name: "Demographics",
    description: "Basic participant background information",
    icon: Users,
    color: "#3B82F6",
    questions: [
      {
        question_text: "What is your age?",
        question_type: "select",
        is_required: true,
        ai_assistance_enabled: false,
        options: [
          { value: "18-24", label: "18-24" },
          { value: "25-34", label: "25-34" },
          { value: "35-44", label: "35-44" },
          { value: "45-54", label: "45-54" },
          { value: "55-64", label: "55-64" },
          { value: "65+", label: "65+" },
        ],
      },
      {
        question_text: "What is your gender identity?",
        question_type: "radio",
        is_required: false,
        ai_assistance_enabled: false,
        options: [
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
          { value: "non-binary", label: "Non-binary" },
          { value: "prefer-not-to-say", label: "Prefer not to say" },
        ],
      },
      {
        question_text: "What is your current employment status?",
        question_type: "select",
        is_required: false,
        ai_assistance_enabled: false,
        options: [
          { value: "employed-full", label: "Employed full-time" },
          { value: "employed-part", label: "Employed part-time" },
          { value: "self-employed", label: "Self-employed" },
          { value: "student", label: "Student" },
          { value: "retired", label: "Retired" },
          { value: "unemployed", label: "Unemployed" },
        ],
      },
      {
        question_text: "What is your approximate annual household income?",
        question_type: "select",
        is_required: false,
        ai_assistance_enabled: false,
        options: [
          { value: "under-25k", label: "Under $25,000" },
          { value: "25k-50k", label: "$25,000 - $50,000" },
          { value: "50k-75k", label: "$50,000 - $75,000" },
          { value: "75k-100k", label: "$75,000 - $100,000" },
          { value: "100k-150k", label: "$100,000 - $150,000" },
          { value: "over-150k", label: "Over $150,000" },
          { value: "prefer-not-to-say", label: "Prefer not to say" },
        ],
      },
    ],
  },
  {
    id: "product-feedback",
    name: "Product Feedback",
    description: "Comprehensive product evaluation questions",
    icon: Star,
    color: "#F59E0B",
    questions: [
      {
        question_text: "How would you rate this product overall?",
        question_type: "range",
        is_required: true,
        ai_assistance_enabled: false,
        options: {
          min: 1,
          max: 10,
          step: 1,
          defaultValue: 5,
          labels: { min: "Poor", max: "Excellent" },
          showValue: true,
        },
      },
      {
        question_text: "What did you like most about this product?",
        question_type: "textarea",
        question_subtitle:
          "Please be specific about features, benefits, or experiences",
        is_required: true,
        ai_assistance_enabled: true,
      },
      {
        question_text: "What could be improved about this product?",
        question_type: "textarea",
        question_subtitle: "Your suggestions help us make better products",
        is_required: false,
        ai_assistance_enabled: true,
      },
      {
        question_text:
          "How likely are you to recommend this product to others?",
        question_type: "range",
        is_required: true,
        ai_assistance_enabled: false,
        options: {
          min: 0,
          max: 10,
          step: 1,
          defaultValue: 5,
          labels: { min: "Not at all likely", max: "Extremely likely" },
          showValue: true,
        },
      },
      {
        question_text: "Would you purchase this product again?",
        question_type: "radio",
        is_required: true,
        ai_assistance_enabled: false,
        options: [
          { value: "definitely", label: "Definitely yes" },
          { value: "probably", label: "Probably yes" },
          { value: "might", label: "Might or might not" },
          { value: "probably-not", label: "Probably not" },
          { value: "definitely-not", label: "Definitely not" },
        ],
      },
    ],
  },
  {
    id: "customer-satisfaction",
    name: "Customer Satisfaction",
    description: "Service quality and satisfaction assessment",
    icon: Heart,
    color: "#EF4444",
    questions: [
      {
        question_text: "How satisfied are you with our service?",
        question_type: "range",
        is_required: true,
        ai_assistance_enabled: false,
        options: {
          min: 1,
          max: 5,
          step: 1,
          defaultValue: 3,
          labels: { min: "Very unsatisfied", max: "Very satisfied" },
          showValue: true,
        },
      },
      {
        question_text: "How would you rate the quality of customer support?",
        question_type: "radio",
        is_required: true,
        ai_assistance_enabled: false,
        options: [
          { value: "excellent", label: "Excellent" },
          { value: "good", label: "Good" },
          { value: "average", label: "Average" },
          { value: "poor", label: "Poor" },
          { value: "very-poor", label: "Very poor" },
        ],
      },
      {
        question_text: "What can we do to improve your experience?",
        question_type: "textarea",
        question_subtitle: "Your feedback is valuable to us",
        is_required: false,
        ai_assistance_enabled: true,
      },
      {
        question_text: "How easy was it to find what you were looking for?",
        question_type: "range",
        is_required: true,
        ai_assistance_enabled: false,
        options: {
          min: 1,
          max: 5,
          step: 1,
          defaultValue: 3,
          labels: { min: "Very difficult", max: "Very easy" },
          showValue: true,
        },
      },
    ],
  },
  {
    id: "market-research",
    name: "Market Research",
    description: "Consumer behavior and market insights",
    icon: TrendingUp,
    color: "#10B981",
    questions: [
      {
        question_text: "How often do you purchase products in this category?",
        question_type: "radio",
        is_required: true,
        ai_assistance_enabled: false,
        options: [
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
          { value: "quarterly", label: "Every few months" },
          { value: "rarely", label: "Rarely" },
          { value: "never", label: "Never" },
        ],
      },
      {
        question_text:
          "What factors are most important when making purchasing decisions?",
        question_type: "textarea",
        question_subtitle: "Consider price, quality, brand, reviews, etc.",
        is_required: true,
        ai_assistance_enabled: true,
      },
      {
        question_text: "Which brands do you currently use?",
        question_type: "textarea",
        question_subtitle: "List your top 3-5 preferred brands",
        is_required: false,
        ai_assistance_enabled: true,
      },
      {
        question_text: "How do you typically discover new products?",
        question_type: "radio",
        is_required: true,
        ai_assistance_enabled: false,
        options: [
          { value: "search-engines", label: "Search engines" },
          { value: "social-media", label: "Social media" },
          { value: "recommendations", label: "Friends/family recommendations" },
          { value: "advertising", label: "Advertising" },
          { value: "reviews", label: "Online reviews" },
          { value: "in-store", label: "In-store browsing" },
        ],
      },
    ],
  },
  {
    id: "user-experience",
    name: "User Experience",
    description: "Website/app usability and user journey",
    icon: Eye,
    color: "#8B5CF6",
    questions: [
      {
        question_text: "How easy was it to navigate our website/app?",
        question_type: "range",
        is_required: true,
        ai_assistance_enabled: false,
        options: {
          min: 1,
          max: 5,
          step: 1,
          defaultValue: 3,
          labels: { min: "Very difficult", max: "Very easy" },
          showValue: true,
        },
      },
      {
        question_text: "Did you encounter any technical issues?",
        question_type: "radio",
        is_required: true,
        ai_assistance_enabled: false,
        options: [
          { value: "none", label: "No issues" },
          { value: "minor", label: "Minor issues" },
          { value: "moderate", label: "Moderate issues" },
          { value: "major", label: "Major issues" },
        ],
      },
      {
        question_text: "What would make your experience better?",
        question_type: "textarea",
        question_subtitle:
          "Suggest improvements to features, design, or functionality",
        is_required: false,
        ai_assistance_enabled: true,
      },
      {
        question_text: "How likely are you to use our platform again?",
        question_type: "range",
        is_required: true,
        ai_assistance_enabled: false,
        options: {
          min: 0,
          max: 10,
          step: 1,
          defaultValue: 5,
          labels: { min: "Not at all likely", max: "Extremely likely" },
          showValue: true,
        },
      },
    ],
  },
];

export function QuestionTemplates({
  isOpen,
  onClose,
  onApplyTemplate,
  categories,
}: QuestionTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<CategoryTemplate | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [targetCategory, setTargetCategory] = useState<string>("");
  const [createNewCategory, setCreateNewCategory] = useState(true);

  const handleTemplateSelect = (template: CategoryTemplate) => {
    setSelectedTemplate(template);
    setSelectedQuestions(
      Array.from({ length: template.questions.length }, (_, i) => i)
    );
    setCreateNewCategory(true);
    setTargetCategory("");
  };

  const handleQuestionToggle = (questionIndex: number) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionIndex)
        ? prev.filter((i) => i !== questionIndex)
        : [...prev, questionIndex]
    );
  };

  const handleApply = () => {
    if (!selectedTemplate) return;

    const questionsToAdd = selectedQuestions.map(
      (index) => selectedTemplate.questions[index]
    );
    const templateToApply = {
      ...selectedTemplate,
      questions: questionsToAdd,
    };

    onApplyTemplate(
      templateToApply,
      createNewCategory ? undefined : targetCategory
    );
    handleClose();
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setSelectedQuestions([]);
    setTargetCategory("");
    setCreateNewCategory(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl">Question Templates</span>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Choose from pre-built question sets to quickly add common survey
                sections
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Template Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900">
              Available Templates
            </h3>
            <div className="space-y-3">
              {QUESTION_TEMPLATES.map((template) => {
                const IconComponent = template.icon;
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md border-2 ${
                      isSelected
                        ? "ring-2 ring-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: template.color }}
                        >
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base font-semibold">
                            {template.name}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {template.description}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            isSelected
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {template.questions.length} questions
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Template Preview */}
          <div className="space-y-4">
            {selectedTemplate ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg text-gray-900">
                    Preview & Customize
                  </h3>
                  <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200">
                    <CheckSquare className="w-3 h-3 mr-1" />
                    {selectedQuestions.length} of{" "}
                    {selectedTemplate.questions.length} selected
                  </Badge>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {selectedTemplate.questions.map((question, index) => {
                    const isSelected = selectedQuestions.includes(index);

                    return (
                      <div
                        key={index}
                        className={`p-4 border-2 rounded-xl transition-all cursor-pointer ${
                          isSelected
                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                            : "bg-gray-50 border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => handleQuestionToggle(index)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleQuestionToggle(index)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">
                              {question.question_text}
                            </p>
                            {question.question_subtitle && (
                              <p className="text-xs text-gray-600 mt-1">
                                {question.question_subtitle}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              <Badge
                                variant="outline"
                                className="text-xs bg-white border-gray-200"
                              >
                                {question.question_type.replace("_", " ")}
                              </Badge>
                              {question.is_required && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-orange-100 text-orange-700 border-orange-200"
                                >
                                  Required
                                </Badge>
                              )}
                              {question.ai_assistance_enabled && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-blue-100 text-blue-700 border-blue-200"
                                >
                                  <Bot className="w-3 h-3 mr-1" />
                                  AI Enhanced
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Category Selection */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <Label className="font-medium text-gray-900">
                    Add questions to:
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <Checkbox
                        id="new-category"
                        checked={createNewCategory}
                        onCheckedChange={(checked) =>
                          setCreateNewCategory(Boolean(checked))
                        }
                      />
                      <Label
                        htmlFor="new-category"
                        className="flex items-center gap-2"
                      >
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: selectedTemplate.color }}
                        />
                        Create new "{selectedTemplate.name}" category
                      </Label>
                    </div>

                    {categories.length > 0 && (
                      <>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200">
                          <Checkbox
                            id="existing-category"
                            checked={!createNewCategory}
                            onCheckedChange={(checked) =>
                              setCreateNewCategory(!Boolean(checked))
                            }
                          />
                          <Label htmlFor="existing-category">
                            Add to existing category:
                          </Label>
                        </div>

                        {!createNewCategory && (
                          <Select
                            value={targetCategory}
                            onValueChange={setTargetCategory}
                          >
                            <SelectTrigger className="ml-6 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem
                                  key={category.name}
                                  value={category.name}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded"
                                      style={{
                                        backgroundColor:
                                          category.color || "#3B82F6",
                                      }}
                                    />
                                    {category.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <Layers className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="font-medium mb-2">
                    Select a template to preview questions
                  </p>
                  <p className="text-sm text-gray-400">
                    Choose from the templates on the left
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-3 pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedTemplate || selectedQuestions.length === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {selectedQuestions.length} Question
            {selectedQuestions.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
