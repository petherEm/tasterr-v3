"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Brain,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Zap,
  Target,
  Settings2,
  HelpCircle,
} from "lucide-react";
import type { AIAssistanceConfig } from "@/lib/types";

const aiConfigSchema = z.object({
  enabled: z.boolean(),
  assistance_type: z.enum([
    "clarification",
    "validation",
    "enhancement",
    "all",
  ]),
  maxRetries: z.number().min(1).max(5),
  confidence_threshold: z.number().min(0).max(1),
  prompt: z.string().optional(),
  triggers: z.object({
    short_answers: z.boolean(),
    incomplete_data: z.boolean(),
    inconsistent_data: z.boolean(),
  }),
});

type AIConfigFormData = z.infer<typeof aiConfigSchema>;

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AIAssistanceConfig) => void;
  currentConfig?: AIAssistanceConfig;
  questionText?: string;
  questionType?: string;
}

const ASSISTANCE_TYPES = [
  {
    value: "clarification" as const,
    label: "Clarification",
    description: "Help users provide clearer, more detailed responses",
    icon: HelpCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    value: "validation" as const,
    label: "Validation",
    description: "Check for completeness and accuracy",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    value: "enhancement" as const,
    label: "Enhancement",
    description: "Suggest improvements and additional insights",
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  {
    value: "all" as const,
    label: "All Types",
    description: "Comprehensive AI assistance for best results",
    icon: Target,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
];

const TRIGGER_OPTIONS = [
  {
    key: "short_answers" as const,
    label: "Short Answers",
    description: "Trigger when responses are too brief or lack detail",
    icon: MessageCircle,
    recommendation: "Recommended for text and essay questions",
  },
  {
    key: "incomplete_data" as const,
    label: "Incomplete Data",
    description: "Trigger when important details are missing",
    icon: AlertCircle,
    recommendation: "Recommended for complex or multi-part questions",
  },
  {
    key: "inconsistent_data" as const,
    label: "Inconsistent Data",
    description: "Trigger when answers seem contradictory",
    icon: Brain,
    recommendation: "Useful for logical consistency checks",
  },
];

export function AIConfigModal({
  isOpen,
  onClose,
  onSave,
  currentConfig,
  questionText,
  questionType,
}: AIConfigModalProps) {
  const form = useForm<AIConfigFormData>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      enabled: currentConfig?.enabled || true,
      assistance_type: currentConfig?.assistance_type || "all",
      maxRetries: currentConfig?.maxRetries || 2,
      confidence_threshold: currentConfig?.confidence_threshold || 0.7,
      prompt: currentConfig?.prompt || "",
      triggers: {
        short_answers: currentConfig?.triggers?.short_answers ?? true,
        incomplete_data: currentConfig?.triggers?.incomplete_data ?? true,
        inconsistent_data: currentConfig?.triggers?.inconsistent_data ?? false,
      },
    },
  });

  const watchedAssistanceType = form.watch("assistance_type");
  const watchedConfidence = form.watch("confidence_threshold");
  const watchedMaxRetries = form.watch("maxRetries");

  const handleSave = (data: AIConfigFormData) => {
    onSave(data);
    onClose();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const getRecommendedTriggers = () => {
    if (!questionType) return [];

    const recommendations = [];

    if (["textarea", "input"].includes(questionType)) {
      recommendations.push("short_answers");
    }

    if (
      ["image_upload_comment", "video_upload", "image_comment"].includes(
        questionType
      )
    ) {
      recommendations.push("incomplete_data");
    }

    return recommendations;
  };

  const selectedAssistanceType = ASSISTANCE_TYPES.find(
    (type) => type.value === watchedAssistanceType
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                AI Assistance Configuration
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Configure how AI will help users provide better responses to
                this question
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          {/* Question Context */}
          {questionText && (
            <Card className="bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Question Context
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">
                    {questionText}
                  </p>
                  {questionType && (
                    <Badge variant="secondary" className="text-xs">
                      {questionType
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assistance Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Assistance Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ASSISTANCE_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  const isSelected = watchedAssistanceType === type.value;

                  return (
                    <div
                      key={type.value}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? `${type.borderColor} ${type.bgColor}`
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() =>
                        form.setValue("assistance_type", type.value)
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg ${type.bgColor} flex items-center justify-center flex-shrink-0`}
                        >
                          <IconComponent className={`w-4 h-4 ${type.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {type.label}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Trigger Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Assistance Triggers
              </CardTitle>
              <p className="text-sm text-gray-600">
                Choose when AI should offer assistance
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {TRIGGER_OPTIONS.map((trigger) => {
                  const IconComponent = trigger.icon;
                  const isRecommended = getRecommendedTriggers().includes(
                    trigger.key
                  );
                  const isChecked = form.watch(`triggers.${trigger.key}`);

                  return (
                    <div
                      key={trigger.key}
                      className="flex items-start space-x-3 p-3 rounded-lg border"
                    >
                      <Checkbox
                        id={trigger.key}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          form.setValue(`triggers.${trigger.key}`, !!checked)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-gray-500" />
                          <Label htmlFor={trigger.key} className="font-medium">
                            {trigger.label}
                          </Label>
                          {isRecommended && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-green-100 text-green-700"
                            >
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {trigger.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {trigger.recommendation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Max Retries */}
              <div>
                <Label className="text-sm font-medium">
                  Maximum AI Interactions
                </Label>
                <p className="text-xs text-gray-600 mb-3">
                  How many times AI can ask users to improve their answer
                </p>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[watchedMaxRetries]}
                    onValueChange={([value]) =>
                      form.setValue("maxRetries", value)
                    }
                    min={1}
                    max={5}
                    step={1}
                    className="flex-1"
                  />
                  <div className="w-16 text-center">
                    <span className="text-sm font-medium text-blue-600">
                      {watchedMaxRetries}
                    </span>
                    <p className="text-xs text-gray-500">
                      {watchedMaxRetries === 1 ? "attempt" : "attempts"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Confidence Threshold */}
              <div>
                <Label className="text-sm font-medium">
                  AI Confidence Threshold
                </Label>
                <p className="text-xs text-gray-600 mb-3">
                  How confident AI must be before offering assistance (higher =
                  more selective)
                </p>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[watchedConfidence]}
                    onValueChange={([value]) =>
                      form.setValue("confidence_threshold", value)
                    }
                    min={0.3}
                    max={0.95}
                    step={0.05}
                    className="flex-1"
                  />
                  <div className="w-16 text-center">
                    <span className="text-sm font-medium text-blue-600">
                      {Math.round(watchedConfidence * 100)}%
                    </span>
                    <p className="text-xs text-gray-500">confidence</p>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>More assistance</span>
                  <span>Less assistance</span>
                </div>
              </div>

              <Separator />

              {/* Custom Prompt */}
              <div>
                <Label htmlFor="prompt" className="text-sm font-medium">
                  Custom AI Prompt (Optional)
                </Label>
                <p className="text-xs text-gray-600 mb-2">
                  Customize how AI evaluates and provides feedback for this
                  specific question
                </p>
                <Textarea
                  id="prompt"
                  {...form.register("prompt")}
                  placeholder="e.g., Focus on encouraging users to provide specific examples and detailed explanations..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use automatic prompts based on question type
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview/Summary */}
          {selectedAssistanceType && (
            <Card
              className={`${selectedAssistanceType.bgColor} ${selectedAssistanceType.borderColor} border`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Bot className="w-4 h-4" />
                  Configuration Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Assistance Type:</span>
                    <Badge className={selectedAssistanceType.bgColor}>
                      {selectedAssistanceType.label}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Max Interactions:</span>
                    <span className="font-medium">{watchedMaxRetries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Confidence Level:</span>
                    <span className="font-medium">
                      {Math.round(watchedConfidence * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-700">Active Triggers:</span>
                    <div className="text-right">
                      {Object.entries(form.watch("triggers")).filter(
                        ([, enabled]) => enabled
                      ).length === 0 ? (
                        <span className="text-gray-500 text-xs">
                          None selected
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {Object.entries(form.watch("triggers"))
                            .filter(([, enabled]) => enabled)
                            .map(([key]) => {
                              const trigger = TRIGGER_OPTIONS.find(
                                (t) => t.key === key
                              );
                              return (
                                <div key={key} className="text-xs">
                                  {trigger?.label}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Bot className="w-4 h-4 mr-2" />
              Save AI Configuration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
