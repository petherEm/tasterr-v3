"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createCustomSurvey } from "@/app/actions/admin";
import type {
  QuestionType,
  ImageOption,
  ImageQuestionOptions,
  ImageCommentOptions,
  ImageCommentItem,
  ImageUploadCommentOptions,
  VideoUploadOptions,
  VideoQuestionOptions,
  VideoOption,
  RangeSliderOptions,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Upload,
  ImageIcon,
  Video,
  BarChart3,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Bot,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import {
  uploadFile,
  generateFilePath,
  compressImage,
} from "@/lib/supabase-storage";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase-client-auth";
import { useUser, useAuth } from "@clerk/nextjs";
import { CategoryManager } from "@/components/admin/category-manager";
import { AIConfigModal } from "@/components/admin/ai-config-modal";
import { CategorizedQuestionView } from "@/components/admin/categorized-question-view";
import { BulkQuestionOperations } from "@/components/admin/bulk-question-operations";
import { QuestionTemplates } from "@/components/admin/question-templates";
import { Badge } from "@/components/ui/badge";

const aiAssistanceConfigSchema = z
  .object({
    enabled: z.boolean(),
    assistance_type: z.enum([
      "clarification",
      "validation",
      "enhancement",
      "all",
    ]),
    maxRetries: z.number().min(1).max(5).optional(),
    confidence_threshold: z.number().min(0).max(1).optional(),
    prompt: z.string().optional(),
    triggers: z
      .object({
        short_answers: z.boolean().optional(),
        incomplete_data: z.boolean().optional(),
        inconsistent_data: z.boolean().optional(),
      })
      .optional(),
  })
  .optional();

const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Nazwa kategorii jest wymagana")
    .max(100, "Nazwa kategorii za długa"),
  description: z.string().optional(),
  order_index: z.number().min(1),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Nieprawidłowy kolor hex")
    .optional(),
  icon: z.string().max(50, "Nazwa ikony za długa").optional(),
});

const questionSchema = z.object({
  question_text: z.string().min(1, "Tekst pytania jest wymagany"),
  question_subtitle: z.string().optional(),
  question_type: z.enum([
    "input",
    "select",
    "radio",
    "textarea",
    "number",
    "image_sort",
    "image_select",
    "image_comment",
    "image_upload_comment",
    "video_upload",
    "video_question",
    "range",
  ]),
  is_required: z.boolean(),
  order_index: z.number(),
  category_id: z.string().optional(),
  ai_assistance_enabled: z.boolean(),
  ai_assistance_config: aiAssistanceConfigSchema,
  options: z
    .union([
      z.array(
        z.object({
          value: z.string().min(1, "Wartość opcji jest wymagana"),
          label: z.string().min(1, "Etykieta opcji jest wymagana"),
        })
      ),
      z.object({}).passthrough(), // Allow any object structure for complex options
      z.null(),
    ])
    .optional(),
});

const surveySchema = z.object({
  title: z.string().min(1, "Tytuł ankiety jest wymagany"),
  description: z.string().optional(),
  introduction: z
    .string()
    .min(10, "Wprowadzenie musi mieć co najmniej 10 znaków"),
  target_audience: z.enum(["all", "new_users", "existing_users"]),
  intro_image_url: z.string().optional(),
  categories: z.array(categorySchema).optional(),
  questions: z
    .array(questionSchema)
    .min(1, "Co najmniej jedno pytanie jest wymagane"),
});

type SurveyFormData = z.infer<typeof surveySchema>;

// Type guard functions
const isImageQuestionOptions = (
  options: unknown
): options is ImageQuestionOptions => {
  return typeof options === "object" && options !== null && "images" in options;
};

const isVideoQuestionOptions = (
  options: unknown
): options is VideoQuestionOptions => {
  return (
    typeof options === "object" && options !== null && "responseType" in options
  );
};

const isImageCommentOptions = (
  options: unknown
): options is ImageCommentOptions => {
  return (
    typeof options === "object" &&
    options !== null &&
    "images" in options &&
    Array.isArray((options as Record<string, unknown>).images)
  );
};

export function SurveyBuilder() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<
    Record<number, boolean>
  >({});
  const [uploadingVideos, setUploadingVideos] = useState<
    Record<number, boolean>
  >({});
  const [uploadingIntroImage, setUploadingIntroImage] = useState(false);
  const [collapsedQuestions, setCollapsedQuestions] = useState<
    Record<number, boolean>
  >({});
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<number, boolean>
  >({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [showAIConfigModal, setShowAIConfigModal] = useState(false);
  const [editingQuestionAI, setEditingQuestionAI] = useState<number | null>(
    null
  );
  const [useCategorizedView, setUseCategorizedView] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [bulkOperationsEnabled, setBulkOperationsEnabled] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const { user } = useUser();
  const { getToken } = useAuth();

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: "",
      description: "",
      introduction: "",
      target_audience: "all",
      intro_image_url: "",
      categories: [],
      questions: [
        {
          question_text: "",
          question_subtitle: "",
          question_type: "input",
          is_required: true,
          order_index: 1,
          category_id: undefined,
          ai_assistance_enabled: true,
          ai_assistance_config: {
            enabled: true,
            assistance_type: "all",
            maxRetries: 2,
            confidence_threshold: 0.7,
            triggers: {
              short_answers: true,
              incomplete_data: true,
              inconsistent_data: false,
            },
          },
          options: [],
        },
      ],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const {
    fields: categoryFields,
    append: appendCategory,
    remove: removeCategory,
    move: moveCategory,
  } = useFieldArray({
    control: form.control,
    name: "categories",
  });

  const watchedQuestions = form.watch("questions");
  const watchedCategories = form.watch("categories");

  const addQuestion = () => {
    append({
      question_text: "",
      question_subtitle: "",
      question_type: "input",
      is_required: true,
      order_index: fields.length + 1,
      category_id: undefined,
      ai_assistance_enabled: true,
      ai_assistance_config: {
        enabled: true,
        assistance_type: "all",
        maxRetries: 2,
        confidence_threshold: 0.7,
        triggers: {
          short_answers: true,
          incomplete_data: true,
          inconsistent_data: false,
        },
      },
      options: [],
    });
  };

  // Category management functions
  const addCategory = () => {
    const nextOrder = (watchedCategories?.length || 0) + 1;
    appendCategory({
      name: `Kategoria ${nextOrder}`,
      description: "",
      order_index: nextOrder,
      color: getRandomCategoryColor(),
      icon: "folder",
    });
  };

  const getRandomCategoryColor = () => {
    const colors = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#06B6D4",
      "#84CC16",
      "#F97316",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const deleteCategory = (categoryIndex: number) => {
    const categoryId =
      watchedCategories?.[categoryIndex]?.name || `temp_${categoryIndex}`;

    // Unassign questions from this category
    watchedQuestions.forEach((question, qIndex) => {
      if (question.category_id === categoryId) {
        form.setValue(`questions.${qIndex}.category_id`, undefined);
      }
    });

    removeCategory(categoryIndex);
  };

  // Bulk operation handlers
  const handleSelectAll = () => {
    const allIndices = Array.from({ length: fields.length }, (_, i) => i);
    setSelectedQuestions(allIndices);
  };

  const handleClearSelection = () => {
    setSelectedQuestions([]);
  };

  const handleToggleSelection = (questionIndex: number) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionIndex)
        ? prev.filter((i) => i !== questionIndex)
        : [...prev, questionIndex]
    );
  };

  const handleBulkMoveToCategory = (
    questionIndices: number[],
    categoryId: string | null
  ) => {
    questionIndices.forEach((index) => {
      form.setValue(`questions.${index}.category_id`, categoryId || undefined);
    });
    setSelectedQuestions([]);
  };

  const handleBulkDuplicate = (questionIndices: number[]) => {
    const questionsToClone = questionIndices.map(
      (index) => watchedQuestions[index]
    );

    questionsToClone.forEach((question, idx) => {
      const newQuestion = {
        ...question,
        question_text: `${question.question_text} (Copy)`,
        order_index: fields.length + idx + 1,
      };
      append(newQuestion);
    });

    setSelectedQuestions([]);
  };

  const handleBulkDelete = (questionIndices: number[]) => {
    // Sort indices in descending order to avoid index shifting issues
    const sortedIndices = [...questionIndices].sort((a, b) => b - a);
    sortedIndices.forEach((index) => remove(index));
    setSelectedQuestions([]);
  };

  const handleBulkToggleAI = (questionIndices: number[], enabled: boolean) => {
    questionIndices.forEach((index) => {
      form.setValue(`questions.${index}.ai_assistance_enabled`, enabled);
      if (enabled) {
        // Initialize AI config if enabling
        const currentConfig = form.watch(
          `questions.${index}.ai_assistance_config`
        );
        if (!currentConfig?.enabled) {
          form.setValue(`questions.${index}.ai_assistance_config`, {
            enabled: true,
            assistance_type: "all",
            maxRetries: 2,
            confidence_threshold: 0.7,
            triggers: {
              short_answers: true,
              incomplete_data: true,
              inconsistent_data: false,
            },
          });
        }
      }
    });
  };

  const handleBulkToggleRequired = (
    questionIndices: number[],
    required: boolean
  ) => {
    questionIndices.forEach((index) => {
      form.setValue(`questions.${index}.is_required`, required);
    });
  };

  const handleBulkToggleCollapse = (
    questionIndices: number[],
    collapsed: boolean
  ) => {
    const updates: Record<number, boolean> = {};
    questionIndices.forEach((index) => {
      updates[index] = collapsed;
    });
    setCollapsedQuestions((prev) => ({ ...prev, ...updates }));
  };

  const handleApplyTemplates = (template: any, targetCategoryId?: string) => {
    const currentQuestions = fields.length;

    template.questions.forEach((templateQuestion: any, index: number) => {
      const newQuestion = {
        question_text: templateQuestion.question_text,
        question_subtitle: templateQuestion.question_subtitle || "",
        question_type: templateQuestion.question_type,
        is_required: templateQuestion.is_required,
        order_index: currentQuestions + index + 1,
        category_id: targetCategoryId,
        ai_assistance_enabled: templateQuestion.ai_assistance_enabled !== false,
        ai_assistance_config: templateQuestion.ai_assistance_config || {
          enabled: true,
          assistance_type: "all",
          maxRetries: 2,
          confidence_threshold: 0.7,
          triggers: {
            short_answers: true,
            incomplete_data: true,
            inconsistent_data: false,
          },
        },
        options: templateQuestion.options || [],
      };
      append(newQuestion);
    });

    setShowTemplatesModal(false);
  };

  const addOption = (questionIndex: number) => {
    const currentOptions = watchedQuestions[questionIndex].options || [];
    if (Array.isArray(currentOptions)) {
      form.setValue(`questions.${questionIndex}.options`, [
        ...currentOptions,
        { value: "", label: "" },
      ]);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const currentOptions = watchedQuestions[questionIndex].options;
    if (Array.isArray(currentOptions)) {
      const newOptions = currentOptions.filter(
        (_, index) => index !== optionIndex
      );
      form.setValue(`questions.${questionIndex}.options`, newOptions);
    }
  };

  const onSubmit = async (data: SurveyFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createCustomSurvey(data as any);
      if (result.success) {
        router.push("/admin/surveys");
      } else {
        console.error("Failed to create survey:", result.error);
      }
    } catch (error) {
      console.error("Failed to create survey:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initializeQuestionOptions = (type: QuestionType) => {
    switch (type) {
      case "input":
      case "textarea":
      case "number":
      case "select":
      case "radio":
        return []; // Default to empty array for simple options
      case "image_sort":
        return {
          images: [],
          sortType: "preference",
          instruction: "Przeciągnij, aby uporządkować według preferencji",
        };
      case "image_select":
        return {
          images: [],
          maxSelections: 3,
          minSelections: 1,
          instruction: "Wybierz swoje ulubione",
        };
      case "image_comment":
        return {
          images: [],
          instruction:
            "Podziel się swoimi przemyśleniami na temat każdego obrazu",
          maxTextLength: 200,
          textPrompt: "Co myślisz o tym obrazie?",
        };
      case "image_upload_comment":
        return {
          maxImages: 3,
          minImages: 1,
          instruction:
            "Prześlij obrazy i podziel się przemyśleniami na ich temat",
          imagePrompt: "Opowiedz nam o tym obrazie",
          maxTextLength: 300,
          allowedFormats: ["jpg", "jpeg", "png", "webp"],
          maxFileSize: 4194304, // 4MB
          requireCommentForEach: true,
        };
      case "video_upload":
        return {
          maxSizeBytes: 52428800,
          maxDurationSeconds: 30,
          acceptedFormats: ["mp4"],
          allowRecording: true,
          instruction: "Podziel się swoimi przemyśleniami w wideo",
        };
      case "video_question":
        return {
          video: null,
          responseType: "text",
          instruction: "Obejrzyj wideo i podziel się swoimi przemyśleniami",
          maxTextLength: 500,
          videoUploadOptions: {
            maxSizeBytes: 52428800,
            maxDurationSeconds: 30,
            acceptedFormats: ["mp4"],
            allowRecording: false,
          },
        };
      case "range":
        return {
          min: 0,
          max: 10,
          step: 1,
          defaultValue: 5,
          labels: { min: "Mało prawdopodobne", max: "Bardzo prawdopodobne" },
          showValue: true,
          instruction: "Użyj suwaka do oceny",
        };
      default:
        return [];
    }
  };

  const handleImageUpload = async (questionIndex: number, files: File[]) => {
    if (!user?.id) {
      console.error("User not authenticated");
      return;
    }

    setUploadingImages((prev) => ({ ...prev, [questionIndex]: true }));

    try {
      const questionOptions = watchedQuestions[questionIndex]?.options;
      const currentOptions = isImageQuestionOptions(questionOptions)
        ? questionOptions
        : { images: [] };
      const newImages: ImageOption[] = [];

      // Upload each file
      for (const file of files) {
        try {
          // Compress image for better performance
          const compressedFile = await compressImage(file, 1200, 0.85);

          // Generate unique file path
          const filePath = generateFilePath(
            user.id,
            "survey-draft",
            file.name,
            "image"
          );

          // Create authenticated Supabase client and upload
          const supabaseClient = await createAuthenticatedSupabaseClient(
            getToken
          );
          const uploadResult = await uploadFile(
            supabaseClient,
            compressedFile,
            "survey-images",
            filePath
          );

          if (uploadResult.success && uploadResult.data) {
            newImages.push({
              id: uploadResult.data.path,
              url: uploadResult.data.publicUrl,
              alt: uploadResult.data.fileName,
              title: uploadResult.data.fileName,
              uploadKey: uploadResult.data.path,
            });
          } else {
            console.error(
              "Upload failed for file:",
              file.name,
              uploadResult.error
            );
          }
        } catch (error) {
          console.error("Error uploading file:", file.name, error);
        }
      }

      // Update form with new images
      if (newImages.length > 0) {
        const updatedOptions = {
          ...currentOptions,
          images: [...(currentOptions.images || []), ...newImages],
        };

        form.setValue(`questions.${questionIndex}.options`, updatedOptions);
      }
    } catch (error) {
      console.error("Upload process failed:", error);
    } finally {
      setUploadingImages((prev) => ({ ...prev, [questionIndex]: false }));
    }
  };

  const removeImage = (questionIndex: number, imageId: string) => {
    const questionOptions = watchedQuestions[questionIndex]?.options;
    if (isImageQuestionOptions(questionOptions) && questionOptions.images) {
      const updatedOptions = {
        ...questionOptions,
        images: questionOptions.images.filter((img) => img.id !== imageId),
      };
      form.setValue(`questions.${questionIndex}.options`, updatedOptions);
    }
  };

  const handleVideoUpload = async (questionIndex: number, file: File) => {
    if (!user?.id) {
      console.error("User not authenticated");
      return;
    }

    setUploadingVideos((prev) => ({ ...prev, [questionIndex]: true }));

    try {
      const questionOptions = watchedQuestions[questionIndex]?.options;
      const currentOptions = isVideoQuestionOptions(questionOptions)
        ? questionOptions
        : {
            responseType: "text" as const,
            instruction: "Watch the video and share your thoughts",
          };

      // Generate unique file path for video
      const filePath = generateFilePath(
        user.id,
        "survey-draft",
        file.name,
        "video"
      );

      // Create authenticated Supabase client and upload
      const supabaseClient = await createAuthenticatedSupabaseClient(getToken);
      const uploadResult = await uploadFile(
        supabaseClient,
        file,
        "survey-videos",
        filePath
      );

      if (uploadResult.success && uploadResult.data) {
        const newVideo: VideoOption = {
          id: uploadResult.data.path,
          url: uploadResult.data.publicUrl,
          title: uploadResult.data.fileName,
          uploadKey: uploadResult.data.path,
        };

        // Update form with new video
        const updatedOptions = {
          ...currentOptions,
          video: newVideo,
        };

        form.setValue(`questions.${questionIndex}.options`, updatedOptions);
      } else {
        console.error("Video upload failed:", uploadResult.error);
      }
    } catch (error) {
      console.error("Video upload process failed:", error);
    } finally {
      setUploadingVideos((prev) => ({ ...prev, [questionIndex]: false }));
    }
  };

  const removeVideo = (questionIndex: number) => {
    const questionOptions = watchedQuestions[questionIndex]?.options;
    if (isVideoQuestionOptions(questionOptions)) {
      const updatedOptions = {
        ...questionOptions,
        video: undefined,
      };
      form.setValue(`questions.${questionIndex}.options`, updatedOptions);
    }
  };

  const handleImageCommentUpload = async (
    questionIndex: number,
    files: File[]
  ) => {
    if (!user?.id) {
      console.error("User not authenticated");
      return;
    }

    setUploadingImages((prev) => ({ ...prev, [questionIndex]: true }));

    try {
      const questionOptions = watchedQuestions[questionIndex]?.options;
      const currentOptions = isImageCommentOptions(questionOptions)
        ? questionOptions
        : {
            images: [],
            instruction: "Provide your thoughts on each image",
            maxTextLength: 200,
            textPrompt: "What do you think about this image?",
          };

      // Check if adding these images would exceed the limit of 5
      const currentImageCount = currentOptions.images?.length || 0;
      const newImageCount = files.length;
      const totalImages = currentImageCount + newImageCount;

      if (totalImages > 5) {
        console.error(
          `Cannot upload ${newImageCount} images. Maximum 5 images allowed. Currently have ${currentImageCount}.`
        );
        alert(
          `Cannot upload ${newImageCount} images. Maximum 5 images allowed. You currently have ${currentImageCount} image(s).`
        );
        setUploadingImages((prev) => ({ ...prev, [questionIndex]: false }));
        return;
      }

      const newImages: ImageCommentItem[] = [];

      // Upload each file
      for (const file of files) {
        try {
          // Compress image for better performance
          const compressedFile = await compressImage(file, 1200, 0.85);

          // Generate unique file path
          const filePath = generateFilePath(
            user.id,
            "survey-draft",
            file.name,
            "image"
          );

          // Create authenticated Supabase client and upload
          const supabaseClient = await createAuthenticatedSupabaseClient(
            getToken
          );
          const uploadResult = await uploadFile(
            supabaseClient,
            compressedFile,
            "survey-images",
            filePath
          );

          if (uploadResult.success && uploadResult.data) {
            newImages.push({
              id: uploadResult.data.path,
              url: uploadResult.data.publicUrl,
              alt: uploadResult.data.fileName,
              title: uploadResult.data.fileName,
              uploadKey: uploadResult.data.path,
              textPrompt:
                currentOptions.textPrompt ||
                "What do you think about this image?",
            });
          } else {
            console.error(
              "Upload failed for file:",
              file.name,
              uploadResult.error
            );
          }
        } catch (error) {
          console.error("Error uploading file:", file.name, error);
        }
      }

      // Update form with new images
      if (newImages.length > 0) {
        const updatedOptions = {
          ...currentOptions,
          images: [...(currentOptions.images || []), ...newImages],
        };

        form.setValue(`questions.${questionIndex}.options`, updatedOptions);
      }
    } catch (error) {
      console.error("Upload process failed:", error);
    } finally {
      setUploadingImages((prev) => ({ ...prev, [questionIndex]: false }));
    }
  };

  const removeImageComment = (questionIndex: number, imageId: string) => {
    const questionOptions = watchedQuestions[questionIndex]?.options;
    if (isImageCommentOptions(questionOptions) && questionOptions.images) {
      const updatedOptions = {
        ...questionOptions,
        images: questionOptions.images.filter((img) => img.id !== imageId),
      };
      form.setValue(`questions.${questionIndex}.options`, updatedOptions);
    }
  };

  const updateImageCommentPrompt = (
    questionIndex: number,
    imageId: string,
    prompt: string
  ) => {
    const questionOptions = watchedQuestions[questionIndex]?.options;
    if (isImageCommentOptions(questionOptions) && questionOptions.images) {
      const updatedOptions = {
        ...questionOptions,
        images: questionOptions.images.map((img) =>
          img.id === imageId ? { ...img, textPrompt: prompt } : img
        ),
      };
      form.setValue(`questions.${questionIndex}.options`, updatedOptions);
    }
  };

  const toggleQuestionCollapse = (questionIndex: number) => {
    setCollapsedQuestions((prev) => ({
      ...prev,
      [questionIndex]: !prev[questionIndex],
    }));
  };

  const handleIntroImageUpload = async (file: File) => {
    if (!user?.id) return;

    setUploadingIntroImage(true);

    try {
      // Compress image for better performance
      const compressedFile = await compressImage(file, 1200, 0.85);

      // Generate unique file path
      const filePath = generateFilePath(
        user.id,
        "survey-intro",
        file.name,
        "image"
      );

      // Create authenticated Supabase client and upload
      const supabaseClient = await createAuthenticatedSupabaseClient(getToken);
      const uploadResult = await uploadFile(
        supabaseClient,
        compressedFile,
        "survey-images",
        filePath
      );

      if (uploadResult.success) {
        // Update form with the image URL
        form.setValue("intro_image_url", uploadResult.data.publicUrl, {
          shouldDirty: true,
        });
      } else {
        console.error("Upload failed:", uploadResult.error);
      }
    } catch (error) {
      console.error("Error uploading intro image:", error);
    } finally {
      setUploadingIntroImage(false);
    }
  };

  const removeIntroImage = () => {
    form.setValue("intro_image_url", "", { shouldDirty: true });
  };

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    console.log(`Started dragging question ${index}`);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    console.log("Ended drag");
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    console.log(`Dragging over question ${index}, dragged: ${draggedIndex}`);

    // Add visual feedback
    const target = e.currentTarget as HTMLElement;
    if (draggedIndex !== null && draggedIndex !== index) {
      target.style.borderTop = draggedIndex < index ? "3px solid #3b82f6" : "";
      target.style.borderBottom =
        draggedIndex > index ? "3px solid #3b82f6" : "";
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.borderTop = "";
    target.style.borderBottom = "";
  };

  const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log(
      `Drop event fired! Dropping at index ${dropIndex}, dragged: ${draggedIndex}`
    );

    // Clean up visual feedback
    const target = e.currentTarget as HTMLElement;
    target.style.borderTop = "";
    target.style.borderBottom = "";

    if (draggedIndex === null || draggedIndex === dropIndex) {
      console.log("Dropping at same position, no change needed");
      return;
    }

    console.log(`Moving question ${draggedIndex} to position ${dropIndex}`);

    // Use the move function from useFieldArray for proper reordering
    move(draggedIndex, dropIndex);

    // Update collapsed states to follow the questions
    const newCollapsedStates: Record<number, boolean> = {};
    Object.keys(collapsedQuestions).forEach((key) => {
      const oldIndex = Number.parseInt(key);
      let newIndex = oldIndex;

      if (oldIndex === draggedIndex) {
        newIndex = dropIndex;
      } else if (draggedIndex < dropIndex) {
        // Moving down: indices between draggedIndex and dropIndex shift up
        if (oldIndex > draggedIndex && oldIndex <= dropIndex) {
          newIndex = oldIndex - 1;
        }
      } else {
        // Moving up: indices between dropIndex and draggedIndex shift down
        if (oldIndex >= dropIndex && oldIndex < draggedIndex) {
          newIndex = oldIndex + 1;
        }
      }

      if (collapsedQuestions[oldIndex]) {
        newCollapsedStates[newIndex] = true;
      }
    });

    setCollapsedQuestions(newCollapsedStates);

    // Update order indices after the move
    setTimeout(() => {
      const currentQuestions = form.getValues("questions");
      const reorderedQuestions = currentQuestions.map((question, index) => ({
        ...question,
        order_index: index + 1,
      }));
      form.setValue("questions", reorderedQuestions, { shouldDirty: true });
      console.log("Updated order indices");
    }, 50);

    console.log("Reordered questions successfully");
  };

  if (previewMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Podgląd Ankiety
              </h2>
              <p className="text-sm text-gray-600">
                Zobacz, jak Twoja ankieta będzie wyglądać dla użytkowników
              </p>
            </div>
          </div>
          <Button
            onClick={() => setPreviewMode(false)}
            variant="outline"
            className="border-blue-200 hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Wyjść z Podglądu
          </Button>
        </div>
        <SurveyPreview data={form.getValues()} />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-xl" />
        <Card className="relative bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-t-xl">
            <CardTitle className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              Informacje o Ankiecie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label
                htmlFor="title"
                className="text-sm font-medium text-gray-700"
              >
                Tytuł Ankiety *
              </Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Wprowadź tytuł ankiety"
                className="border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
              />
              {form.formState.errors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.title.message}
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
              <Input
                id="description"
                {...form.register("description")}
                placeholder="Krótki opis ankiety"
                className="border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="introduction"
                className="text-sm font-medium text-gray-700"
              >
                Wprowadzenie *
              </Label>
              <Textarea
                id="introduction"
                {...form.register("introduction")}
                placeholder="Wiadomość powitalna i instrukcje dla wypełniających ankietę"
                rows={3}
                className="border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none"
              />
              {form.formState.errors.introduction && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.introduction.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="target_audience"
                  className="text-sm font-medium text-gray-700"
                >
                  Grupa Docelowa
                </Label>
                <Select
                  value={form.watch("target_audience")}
                  onValueChange={(
                    value: "all" | "new_users" | "existing_users"
                  ) => form.setValue("target_audience", value)}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-400 focus:ring-blue-400/20">
                    <SelectValue placeholder="Wybierz grupę docelową" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszyscy Użytkownicy</SelectItem>
                    <SelectItem value="new_users">
                      Tylko Nowi Użytkownicy
                    </SelectItem>
                    <SelectItem value="existing_users">
                      Tylko Istniejący Użytkownicy
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Obraz Okładki Ankiety (Opcjonalny)
                </Label>
                <p className="text-xs text-gray-500">
                  Przesłij obraz dla karty ankiety
                </p>

                {form.watch("intro_image_url") ? (
                  <div className="relative group">
                    <img
                      src={form.watch("intro_image_url") || "/placeholder.svg"}
                      alt="Okładka ankiety"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={removeIntroImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleIntroImageUpload(file);
                        }
                      }}
                      className="hidden"
                      id="intro-image-upload"
                      disabled={uploadingIntroImage}
                    />
                    <label
                      htmlFor="intro-image-upload"
                      className={`
                        ${
                          uploadingIntroImage
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer hover:border-blue-400 hover:bg-blue-50/50"
                        }
                        border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center transition-all
                      `}
                    >
                      {uploadingIntroImage ? (
                        <div className="flex flex-col items-center space-y-2">
                          <Upload className="w-6 h-6 animate-spin text-blue-500" />
                          <span className="text-sm text-gray-600">
                            Przesyłanie...
                          </span>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm font-medium text-gray-700 mb-1">
                            Kliknij, aby przesłać obraz okładki
                          </span>
                          <span className="text-xs text-gray-500 text-center">
                            JPG, PNG, WebP • Max 4MB
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Management */}
      <CategoryManager
        categories={watchedCategories || []}
        onAddCategory={(category) => {
          const nextOrder = (watchedCategories?.length || 0) + 1;
          appendCategory({
            ...category,
            order_index: nextOrder,
          });
        }}
        onUpdateCategory={(index, updates) => {
          const currentCategories = watchedCategories || [];
          const updatedCategory = { ...currentCategories[index], ...updates };
          form.setValue(`categories.${index}`, updatedCategory);
        }}
        onDeleteCategory={(index) => {
          const categoryName = watchedCategories?.[index]?.name;

          // Unassign questions from this category
          watchedQuestions.forEach((question, qIndex) => {
            if (question.category_id === categoryName) {
              form.setValue(`questions.${qIndex}.category_id`, undefined);
            }
          });

          removeCategory(index);
        }}
        onReorderCategories={(fromIndex, toIndex) => {
          moveCategory(fromIndex, toIndex);

          // Update order indices
          const reorderedCategories = watchedCategories || [];
          reorderedCategories.forEach((category, index) => {
            form.setValue(`categories.${index}.order_index`, index + 1);
          });
        }}
      />

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl blur-xl" />
        <Card className="relative bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-t-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-white" />
                </div>
                Pytania Ankiety
              </CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                {(watchedCategories?.length || 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Widok:
                    </Label>
                    <Button
                      type="button"
                      variant={useCategorizedView ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUseCategorizedView(!useCategorizedView)}
                      className={
                        useCategorizedView
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                          : "border-indigo-200 hover:bg-indigo-50"
                      }
                    >
                      {useCategorizedView ? "📁 Kategorie" : "📄 Lista"}
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Edycja Zbiorcza:
                  </Label>
                  <Button
                    type="button"
                    variant={bulkOperationsEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBulkOperationsEnabled(!bulkOperationsEnabled);
                      if (bulkOperationsEnabled) {
                        setSelectedQuestions([]);
                      }
                    }}
                    className={
                      bulkOperationsEnabled
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                        : "border-indigo-200 hover:bg-indigo-50"
                    }
                  >
                    {bulkOperationsEnabled ? "✅ Włączona" : "☐ Wyłączona"}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addQuestion}
                  className="border-indigo-200 hover:bg-indigo-50 bg-transparent"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj Pytanie
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTemplatesModal(true)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj z Szablonów
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Bulk Operations Bar */}
            {bulkOperationsEnabled && (
              <BulkQuestionOperations
                selectedQuestions={selectedQuestions}
                totalQuestions={fields.length}
                categories={watchedCategories || []}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onMoveToCategory={handleBulkMoveToCategory}
                onDuplicateQuestions={handleBulkDuplicate}
                onDeleteQuestions={handleBulkDelete}
                onToggleAI={handleBulkToggleAI}
                onToggleRequired={handleBulkToggleRequired}
                onToggleCollapse={handleBulkToggleCollapse}
              />
            )}

            {useCategorizedView && (watchedCategories?.length || 0) > 0 ? (
              <CategorizedQuestionView
                questions={watchedQuestions || []}
                categories={watchedCategories || []}
                onAddQuestion={(categoryId) => {
                  const newQuestion = {
                    question_text: "",
                    question_subtitle: "",
                    question_type: "input" as const,
                    is_required: true,
                    order_index: fields.length + 1,
                    category_id: categoryId,
                    ai_assistance_enabled: true,
                    ai_assistance_config: {
                      enabled: true,
                      assistance_type: "all" as const,
                      maxRetries: 2,
                      confidence_threshold: 0.7,
                      triggers: {
                        short_answers: true,
                        incomplete_data: true,
                        inconsistent_data: false,
                      },
                    },
                    options: [],
                  };
                  append(newQuestion);
                }}
                onEditQuestion={(questionIndex) => {
                  // Expand the question for editing
                  setCollapsedQuestions((prev) => ({
                    ...prev,
                    [questionIndex]: false,
                  }));
                }}
                onDeleteQuestion={(questionIndex) => {
                  remove(questionIndex);
                }}
                onMoveQuestion={(questionIndex, toCategoryId) => {
                  form.setValue(
                    `questions.${questionIndex}.category_id`,
                    toCategoryId
                  );
                }}
                onReorderQuestions={(fromIndex, toIndex) => {
                  move(fromIndex, toIndex);
                }}
                collapsedQuestions={collapsedQuestions}
                onToggleCollapse={(questionIndex) => {
                  setCollapsedQuestions((prev) => ({
                    ...prev,
                    [questionIndex]: !prev[questionIndex],
                  }));
                }}
                selectedQuestions={selectedQuestions}
                onToggleSelection={handleToggleSelection}
                bulkOperationsEnabled={bulkOperationsEnabled}
              />
            ) : (
              fields.map((field, questionIndex) => {
                const isCollapsed = collapsedQuestions[questionIndex];
                const watchedQuestion = watchedQuestions[questionIndex];
                const questionPreview =
                  watchedQuestion?.question_text ||
                  `Pytanie ${questionIndex + 1}`;
                const questionTypeLabel = watchedQuestion?.question_type
                  ? watchedQuestion.question_type
                      .replace("_", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())
                  : "Wybierz typ";

                return (
                  <div
                    key={field.id}
                    className={`relative border border-gray-200 rounded-xl transition-all hover:shadow-md ${
                      draggedIndex === questionIndex
                        ? "opacity-50 shadow-lg ring-2 ring-blue-300"
                        : ""
                    }`}
                    draggable
                    onDragStart={handleDragStart(questionIndex)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver(questionIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop(questionIndex)}
                  >
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-t-xl border-b border-gray-100">
                      <div className="flex items-center space-x-3 flex-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200/50"
                        >
                          <GripVertical className="h-4 w-4 text-gray-500" />
                        </Button>

                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-800">
                              Question {questionIndex + 1}
                            </span>
                            {questionPreview &&
                              questionPreview !==
                                `Question ${questionIndex + 1}` && (
                                <span className="text-sm text-gray-600 italic truncate max-w-md">
                                  -{" "}
                                  {questionPreview.length > 50
                                    ? `${questionPreview.substring(0, 50)}...`
                                    : questionPreview}
                                </span>
                              )}
                            <Badge
                              variant="outline"
                              className="text-xs bg-white border-gray-200"
                            >
                              {questionTypeLabel}
                            </Badge>
                            {watchedQuestion?.is_required && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-orange-100 text-orange-700 border-orange-200"
                              >
                                Wymagane
                              </Badge>
                            )}
                            {watchedQuestion?.ai_assistance_enabled && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-100 text-blue-700 border-blue-200"
                              >
                                <Bot className="w-3 h-3 mr-1" />
                                AI
                              </Badge>
                            )}
                          </div>

                          {isCollapsed && questionPreview && (
                            <p className="text-sm text-gray-600 mt-1 truncate max-w-md">
                              {questionPreview.length > 60
                                ? `${questionPreview.substring(0, 60)}...`
                                : questionPreview}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          <Button
                            type="button"
                            onClick={() =>
                              toggleQuestionCollapse(questionIndex)
                            }
                            variant="ghost"
                            size="sm"
                            className="hover:bg-gray-200/50"
                          >
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4" />
                            )}
                          </Button>

                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(questionIndex)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Question Content - Collapsible */}
                    {!isCollapsed && (
                      <div className="p-6 bg-white rounded-b-xl">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label
                              htmlFor={`questions.${questionIndex}.question_text`}
                              className="text-sm font-medium text-gray-700"
                            >
                              Question Text *
                            </Label>
                            <Textarea
                              {...form.register(
                                `questions.${questionIndex}.question_text`
                              )}
                              placeholder="Wprowadź swoje pytanie (możesz napisać dłuższe pytania tutaj)"
                              className="border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none"
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor={`questions.${questionIndex}.question_subtitle`}
                              className="text-sm font-medium text-gray-700"
                            >
                              Podtytuł (Opcjonalny)
                            </Label>
                            <Input
                              {...form.register(
                                `questions.${questionIndex}.question_subtitle`
                              )}
                              placeholder="Dodatkowy kontekst lub tekst pomocy"
                              className="border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">
                                Question Type
                              </Label>
                              <Select
                                value={form.watch(
                                  `questions.${questionIndex}.question_type`
                                )}
                                onValueChange={(value: QuestionType) => {
                                  form.setValue(
                                    `questions.${questionIndex}.question_type`,
                                    value
                                  );

                                  // Initialize appropriate options structure for the question type
                                  const initialOptions =
                                    initializeQuestionOptions(value);
                                  form.setValue(
                                    `questions.${questionIndex}.options`,
                                    initialOptions
                                  );
                                }}
                              >
                                <SelectTrigger className="border-gray-200 focus:border-blue-400 focus:ring-blue-400/20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="input">
                                    <div className="flex items-center gap-2">
                                      <span>📝</span> Text Input
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="textarea">
                                    <div className="flex items-center gap-2">
                                      <span>📄</span> Long Text
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="number">
                                    <div className="flex items-center gap-2">
                                      <span>🔢</span> Number
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="select">
                                    <div className="flex items-center gap-2">
                                      <span>📋</span> Dropdown
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="radio">
                                    <div className="flex items-center gap-2">
                                      <span>🔘</span> Multiple Choice
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="image_sort">
                                    <div className="flex items-center gap-2">
                                      <ImageIcon className="w-4 h-4" /> Image
                                      Sorting
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="image_select">
                                    <div className="flex items-center gap-2">
                                      <ImageIcon className="w-4 h-4" /> Image
                                      Selection
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="image_comment">
                                    <div className="flex items-center gap-2">
                                      <ImageIcon className="w-4 h-4" /> Image
                                      Commentary
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="image_upload_comment">
                                    <div className="flex items-center gap-2">
                                      <ImageIcon className="w-4 h-4" /> User
                                      Image Upload
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="video_upload">
                                    <div className="flex items-center gap-2">
                                      <Video className="w-4 h-4" /> Video Upload
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="video_question">
                                    <div className="flex items-center gap-2">
                                      <Video className="w-4 h-4" /> Video
                                      Question
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="range">
                                    <div className="flex items-center gap-2">
                                      <BarChart3 className="w-4 h-4" /> Range
                                      Slider
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">
                                Category (Optional)
                              </Label>
                              <Select
                                value={
                                  form.watch(
                                    `questions.${questionIndex}.category_id`
                                  ) || "none"
                                }
                                onValueChange={(value) => {
                                  form.setValue(
                                    `questions.${questionIndex}.category_id`,
                                    value === "none" ? undefined : value
                                  );
                                }}
                              >
                                <SelectTrigger className="border-gray-200 focus:border-blue-400 focus:ring-blue-400/20">
                                  <SelectValue placeholder="Wybierz kategorię" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-400">—</span>
                                      No Category
                                    </div>
                                  </SelectItem>
                                  {(watchedCategories || []).map(
                                    (category, catIndex) => (
                                      <SelectItem
                                        key={catIndex}
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
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/50 to-blue-50/30 rounded-xl border border-gray-100">
                            <div className="flex items-center space-x-6">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={form.watch(
                                    `questions.${questionIndex}.is_required`
                                  )}
                                  onCheckedChange={(checked) =>
                                    form.setValue(
                                      `questions.${questionIndex}.is_required`,
                                      !!checked
                                    )
                                  }
                                  className="border-gray-300"
                                />
                                <Label className="text-sm font-medium text-gray-700">
                                  Wymagane
                                </Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={form.watch(
                                    `questions.${questionIndex}.ai_assistance_enabled`
                                  )}
                                  onCheckedChange={(checked) => {
                                    form.setValue(
                                      `questions.${questionIndex}.ai_assistance_enabled`,
                                      !!checked
                                    );
                                    if (checked) {
                                      // Initialize AI config if enabling
                                      const currentConfig = form.watch(
                                        `questions.${questionIndex}.ai_assistance_config`
                                      );
                                      if (!currentConfig?.enabled) {
                                        form.setValue(
                                          `questions.${questionIndex}.ai_assistance_config`,
                                          {
                                            enabled: true,
                                            assistance_type: "all",
                                            maxRetries: 2,
                                            confidence_threshold: 0.7,
                                            triggers: {
                                              short_answers: true,
                                              incomplete_data: true,
                                              inconsistent_data: false,
                                            },
                                          }
                                        );
                                      }
                                    }
                                  }}
                                  className="border-gray-300"
                                />
                                <Label className="text-sm font-medium text-gray-700">
                                  AI Assistance
                                </Label>
                                {form.watch(
                                  `questions.${questionIndex}.ai_assistance_enabled`
                                ) && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingQuestionAI(questionIndex);
                                      setShowAIConfigModal(true);
                                    }}
                                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                  >
                                    <Bot className="w-3 h-3 mr-1" />
                                    Configure
                                  </Button>
                                )}
                              </div>
                            </div>

                            {form.watch(
                              `questions.${questionIndex}.ai_assistance_enabled`
                            ) && (
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                  <Bot className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-blue-600 font-medium">
                                  AI Enhanced
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Question Type Specific Configuration */}
                          <QuestionTypeConfig
                            questionIndex={questionIndex}
                            questionType={form.watch(
                              `questions.${questionIndex}.question_type`
                            )}
                            options={watchedQuestions[questionIndex].options}
                            onOptionsChange={(newOptions) =>
                              form.setValue(
                                `questions.${questionIndex}.options`,
                                newOptions as any
                              )
                            }
                            onImageUpload={(files) =>
                              handleImageUpload(questionIndex, files)
                            }
                            onRemoveImage={(imageId) =>
                              removeImage(questionIndex, imageId)
                            }
                            onImageCommentUpload={(files) =>
                              handleImageCommentUpload(questionIndex, files)
                            }
                            onRemoveImageComment={(imageId) =>
                              removeImageComment(questionIndex, imageId)
                            }
                            onUpdateImageCommentPrompt={(imageId, prompt) =>
                              updateImageCommentPrompt(
                                questionIndex,
                                imageId,
                                prompt
                              )
                            }
                            onVideoUpload={(file) =>
                              handleVideoUpload(questionIndex, file)
                            }
                            onRemoveVideo={() => removeVideo(questionIndex)}
                            uploadingImages={uploadingImages[questionIndex]}
                            uploadingVideos={uploadingVideos[questionIndex]}
                            setUploadingImages={setUploadingImages}
                            addOption={() => addOption(questionIndex)}
                            removeOption={(optionIndex) =>
                              removeOption(questionIndex, optionIndex)
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 p-6 bg-gradient-to-r from-gray-50/50 to-blue-50/30 rounded-xl border border-gray-100">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPreviewMode(true)}
          className="border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          <Eye className="h-4 w-4 mr-2" />
          Podgląd Ankiety
        </Button>

        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/surveys")}
            className="border-gray-200 hover:bg-gray-50"
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isSubmitting ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-spin" />
                Tworzenie...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Utwórz Ankietę
              </>
            )}
          </Button>
        </div>
      </div>

      {/* AI Configuration Modal */}
      <AIConfigModal
        isOpen={showAIConfigModal}
        onClose={() => {
          setShowAIConfigModal(false);
          setEditingQuestionAI(null);
        }}
        onSave={(config) => {
          if (editingQuestionAI !== null) {
            form.setValue(
              `questions.${editingQuestionAI}.ai_assistance_config`,
              config
            );
          }
        }}
        currentConfig={
          editingQuestionAI !== null
            ? form.watch(`questions.${editingQuestionAI}.ai_assistance_config`)
            : undefined
        }
        questionText={
          editingQuestionAI !== null
            ? form.watch(`questions.${editingQuestionAI}.question_text`)
            : undefined
        }
        questionType={
          editingQuestionAI !== null
            ? form.watch(`questions.${editingQuestionAI}.question_type`)
            : undefined
        }
      />

      {/* Question Templates Modal */}
      <QuestionTemplates
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onApplyTemplate={handleApplyTemplates}
        categories={watchedCategories || []}
      />
    </form>
  );
}

// Survey Preview Component
function SurveyPreview({ data }: { data: SurveyFormData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.title}</CardTitle>
        {data.description && (
          <p className="text-gray-600">{data.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-gray-700">{data.introduction}</p>
        </div>

        {data.questions.map((question, index) => (
          <div key={index} className="space-y-2">
            <Label className="text-base font-medium">
              {index + 1}. {question.question_text}
              {question.is_required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            {question.question_subtitle && (
              <p className="text-sm text-gray-600">
                {question.question_subtitle}
              </p>
            )}

            {question.question_type === "input" && (
              <Input placeholder="Wprowadzanie tekstu" disabled />
            )}
            {question.question_type === "textarea" && (
              <Textarea
                placeholder="Długie wprowadzanie tekstu"
                disabled
                rows={3}
              />
            )}
            {question.question_type === "number" && (
              <Input type="number" placeholder="Wprowadzanie liczby" disabled />
            )}
            {question.question_type === "select" &&
              Array.isArray(question.options) && (
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz opcję" />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options.map((option, optionIndex) => (
                      <SelectItem key={optionIndex} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            {question.question_type === "radio" &&
              Array.isArray(question.options) && (
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className="flex items-center space-x-2"
                    >
                      <input type="radio" name={`preview-q${index}`} disabled />
                      <Label>{option.label}</Label>
                    </div>
                  ))}
                </div>
              )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Question Type Configuration Component
interface QuestionTypeConfigProps {
  questionIndex: number;
  questionType: QuestionType;
  options: unknown;
  onOptionsChange: (options: unknown) => void;
  onImageUpload: (files: File[]) => void;
  onRemoveImage: (imageId: string) => void;
  onImageCommentUpload?: (files: File[]) => void;
  onRemoveImageComment?: (imageId: string) => void;
  onUpdateImageCommentPrompt?: (imageId: string, prompt: string) => void;
  onVideoUpload?: (file: File) => void;
  onRemoveVideo?: () => void;
  uploadingImages?: boolean;
  uploadingVideos?: boolean;
  setUploadingImages?: (
    updater: (prev: Record<number, boolean>) => Record<number, boolean>
  ) => void;
  addOption: () => void;
  removeOption: (index: number) => void;
}

function QuestionTypeConfig({
  questionIndex,
  questionType,
  options,
  onOptionsChange,
  onImageUpload,
  onRemoveImage,
  onImageCommentUpload,
  onRemoveImageComment,
  onUpdateImageCommentPrompt,
  onVideoUpload,
  onRemoveVideo,
  uploadingImages,
  uploadingVideos,
  setUploadingImages,
  addOption,
  removeOption,
}: QuestionTypeConfigProps) {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onImageUpload(files);
    }
  };

  // Legacy options for select/radio
  if (questionType === "select" || questionType === "radio") {
    const selectOptions = Array.isArray(options) ? options : [];

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Opcje Odpowiedzi</Label>
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="h-3 w-3 mr-1" />
            Dodaj Opcję
          </Button>
        </div>
        <div className="space-y-2">
          {selectOptions.map((option, optionIndex) => (
            <div key={optionIndex} className="flex items-center space-x-2">
              <Input
                placeholder="Wartość opcji (np. 'zadowolony')"
                value={option?.value || ""}
                onChange={(e) => {
                  const newOptions = [...selectOptions];
                  newOptions[optionIndex] = {
                    ...newOptions[optionIndex],
                    value: e.target.value,
                  };
                  onOptionsChange(newOptions);
                }}
              />
              <Input
                placeholder="Etykieta opcji (np. 'Bardzo Zadowolony')"
                value={option?.label || ""}
                onChange={(e) => {
                  const newOptions = [...selectOptions];
                  newOptions[optionIndex] = {
                    ...newOptions[optionIndex],
                    label: e.target.value,
                  };
                  onOptionsChange(newOptions);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeOption(optionIndex)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Image Questions Configuration
  if (questionType === "image_sort" || questionType === "image_select") {
    const imageOptions = (options as ImageQuestionOptions) || { images: [] };

    return (
      <div className="space-y-4">
        <div>
          <Label>Obrazy dla Pytania</Label>
          <div className="mt-2 space-y-4">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id={`image-upload-${questionIndex}`}
                disabled={uploadingImages}
              />
              <label
                htmlFor={`image-upload-${questionIndex}`}
                className={`${
                  uploadingImages ? "cursor-not-allowed" : "cursor-pointer"
                } flex flex-col items-center justify-center space-y-2`}
              >
                {uploadingImages ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="flex items-center space-x-2">
                      <Upload className="w-5 h-5 animate-spin" />
                      <span className="text-sm text-gray-600">
                        Przesyłanie...
                      </span>
                    </div>
                    {/* Debug reset button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        console.log(
                          "Manual reset for question:",
                          questionIndex
                        );
                        onOptionsChange({
                          ...imageOptions,
                          images: imageOptions.images || [],
                        });
                        setUploadingImages?.((prev) => ({
                          ...prev,
                          [questionIndex]: false,
                        }));
                      }}
                      className="text-xs"
                    >
                      Resetuj jeśli zawiesił się
                    </Button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Kliknij, aby przesłać obrazy
                    </span>
                    <span className="text-xs text-gray-500">
                      JPG, PNG, WebP (maks. 4MB każdy)
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Uploaded Images */}
            {imageOptions.images && imageOptions.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {imageOptions.images.map((image: ImageOption) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.url || "/placeholder.svg"}
                      alt={image.alt}
                      className="w-full h-24 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                      onClick={() => onRemoveImage(image.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Question-specific settings */}
        <div className="space-y-3">
          <div>
            <Label>Instrukcje</Label>
            <Input
              placeholder="Instrukcje dla użytkowników"
              value={imageOptions.instruction || ""}
              onChange={(e) =>
                onOptionsChange({
                  ...imageOptions,
                  instruction: e.target.value,
                })
              }
            />
          </div>

          {questionType === "image_sort" && (
            <div>
              <Label>Typ Sortowania</Label>
              <Select
                value={imageOptions.sortType || "preference"}
                onValueChange={(value) =>
                  onOptionsChange({ ...imageOptions, sortType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preference">Według Preferencji</SelectItem>
                  <SelectItem value="ranking">Według Rankingu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {questionType === "image_select" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min. Wybory</Label>
                <Input
                  type="number"
                  min={1}
                  value={imageOptions.minSelections || 1}
                  onChange={(e) =>
                    onOptionsChange({
                      ...imageOptions,
                      minSelections: Number.parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div>
                <Label>Maks. Wybory</Label>
                <Input
                  type="number"
                  min={1}
                  value={imageOptions.maxSelections || 3}
                  onChange={(e) =>
                    onOptionsChange({
                      ...imageOptions,
                      maxSelections: Number.parseInt(e.target.value) || 3,
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Image Comment Configuration
  if (questionType === "image_comment") {
    const imageCommentOptions = (options as ImageCommentOptions) || {
      images: [],
    };

    const handleImageCommentUpload = (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const files = Array.from(event.target.files || []);
      if (files.length > 0 && onImageCommentUpload) {
        onImageCommentUpload(files);
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <Label>Obrazy do Komentowania (1-5 obrazów)</Label>
          <div className="mt-2 space-y-4">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageCommentUpload}
                className="hidden"
                id={`image-comment-upload-${questionIndex}`}
                disabled={
                  uploadingImages ||
                  (imageCommentOptions.images?.length || 0) >= 5
                }
              />
              <label
                htmlFor={`image-comment-upload-${questionIndex}`}
                className={`${
                  uploadingImages ||
                  (imageCommentOptions.images?.length || 0) >= 5
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                } flex flex-col items-center justify-center space-y-2`}
              >
                {uploadingImages ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="flex items-center space-x-2">
                      <Upload className="w-5 h-5 animate-spin" />
                      <span className="text-sm text-gray-600">
                        Przesyłanie...
                      </span>
                    </div>
                  </div>
                ) : (imageCommentOptions.images?.length || 0) >= 5 ? (
                  <>
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Osiągnięto maksimum 5 obrazów
                    </span>
                    <span className="text-xs text-gray-500">
                      Usuń obrazy, aby przesłać więcej
                    </span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Kliknij, aby przesłać obrazy (
                      {imageCommentOptions.images?.length || 0}/5)
                    </span>
                    <span className="text-xs text-gray-500">
                      JPG, PNG, WebP (maks. 4MB każdy)
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Uploaded Images with Individual Prompts */}
            {imageCommentOptions.images &&
              imageCommentOptions.images.length > 0 && (
                <div className="space-y-4">
                  {imageCommentOptions.images.map(
                    (image: ImageCommentItem, index: number) => (
                      <div
                        key={image.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative group flex-shrink-0">
                            <img
                              src={image.url || "/placeholder.svg"}
                              alt={image.alt}
                              className="w-24 h-24 object-cover rounded border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                              onClick={() => onRemoveImageComment?.(image.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div>
                              <Label className="text-sm font-medium">
                                Prompt dla Obrazu {index + 1}
                              </Label>
                              <Input
                                placeholder="O czym użytkownicy powinni komentować to zdjęcie?"
                                value={image.textPrompt || ""}
                                onChange={(e) =>
                                  onUpdateImageCommentPrompt?.(
                                    image.id,
                                    e.target.value
                                  )
                                }
                                className="mt-1"
                              />
                            </div>
                            <div className="text-xs text-gray-500">
                              {image.title}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
          </div>
        </div>

        {/* Global Settings */}
        <div className="space-y-3">
          <div>
            <Label>Ogólne Instrukcje</Label>
            <Input
              placeholder="Ogólne instrukcje dla wszystkich zdjęć"
              value={imageCommentOptions.instruction || ""}
              onChange={(e) =>
                onOptionsChange({
                  ...imageCommentOptions,
                  instruction: e.target.value,
                })
              }
            />
          </div>

          <div>
            <Label>Domyślny Prompt Tekstowy</Label>
            <Input
              placeholder="Domyślny komunikat dla nowych zdjęć"
              value={imageCommentOptions.textPrompt || ""}
              onChange={(e) =>
                onOptionsChange({
                  ...imageCommentOptions,
                  textPrompt: e.target.value,
                })
              }
            />
            <div className="text-xs text-gray-500 mt-1">
              Będzie używany jako domyślny prompt dla nowo przesłanych obrazów
            </div>
          </div>

          <div>
            <Label>Maks. Długość Tekstu na Obraz</Label>
            <Input
              type="number"
              min={50}
              max={1000}
              value={imageCommentOptions.maxTextLength || 200}
              onChange={(e) =>
                onOptionsChange({
                  ...imageCommentOptions,
                  maxTextLength: Number.parseInt(e.target.value) || 200,
                })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  // Image Upload Comment Configuration (users upload images and add comments)
  if (questionType === "image_upload_comment") {
    const uploadCommentOptions = (options as ImageUploadCommentOptions) || {
      maxImages: 3,
      minImages: 1,
      instruction:
        "Prześlij obrazy i podziel się swoimi myślami na temat każdego z nich",
      imagePrompt: "Opowiedz nam o tym obrazie",
      maxTextLength: 300,
      requireCommentForEach: true,
    };

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">
            Przesyłanie Obrazów i Komentarzy przez Użytkowników
          </h3>
          <p className="text-sm text-blue-800">
            Użytkownicy będą przesyłać własne obrazy i dodawać komentarze do
            każdego z nich. Skonfiguruj wymagania i prompty poniżej.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Ogólne Instrukcje</Label>
            <Input
              placeholder="Powiedz użytkownikom, jakie zdjęcia przesyłać i dlaczego"
              value={uploadCommentOptions.instruction || ""}
              onChange={(e) =>
                onOptionsChange({
                  ...uploadCommentOptions,
                  instruction: e.target.value,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minimalna Liczba Wymaganych Zdjęć</Label>
              <Select
                value={uploadCommentOptions.minImages?.toString() || "1"}
                onValueChange={(value) =>
                  onOptionsChange({
                    ...uploadCommentOptions,
                    minImages: Number.parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 (Opcjonalnie)</SelectItem>
                  <SelectItem value="1">1 Obraz</SelectItem>
                  <SelectItem value="2">2 Obrazy</SelectItem>
                  <SelectItem value="3">3 Obrazy</SelectItem>
                  <SelectItem value="4">4 Obrazy</SelectItem>
                  <SelectItem value="5">5 Obrazów</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Maksymalna Dozwolona Liczba Obrazów</Label>
              <Select
                value={uploadCommentOptions.maxImages?.toString() || "3"}
                onValueChange={(value) =>
                  onOptionsChange({
                    ...uploadCommentOptions,
                    maxImages: Number.parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Obraz</SelectItem>
                  <SelectItem value="2">2 Obrazy</SelectItem>
                  <SelectItem value="3">3 Obrazy</SelectItem>
                  <SelectItem value="4">4 Obrazy</SelectItem>
                  <SelectItem value="5">5 Obrazów</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Prompt Komentarza dla Każdego Obrazu</Label>
            <Input
              placeholder="Co użytkownicy powinni napisać o każdym przesyłanym zdjęciu?"
              value={uploadCommentOptions.imagePrompt || ""}
              onChange={(e) =>
                onOptionsChange({
                  ...uploadCommentOptions,
                  imagePrompt: e.target.value,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Maks. Znaków na Komentarz</Label>
              <Input
                type="number"
                min={50}
                max={1000}
                value={uploadCommentOptions.maxTextLength || 300}
                onChange={(e) =>
                  onOptionsChange({
                    ...uploadCommentOptions,
                    maxTextLength: Number.parseInt(e.target.value) || 300,
                  })
                }
              />
            </div>

            <div>
              <Label>Maks. Rozmiar Pliku na Obraz (MB)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={Math.round(
                  (uploadCommentOptions.maxFileSize || 4194304) / 1024 / 1024
                )}
                onChange={(e) =>
                  onOptionsChange({
                    ...uploadCommentOptions,
                    maxFileSize:
                      (Number.parseInt(e.target.value) || 4) * 1024 * 1024,
                  })
                }
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={uploadCommentOptions.requireCommentForEach ?? true}
              onCheckedChange={(checked) =>
                onOptionsChange({
                  ...uploadCommentOptions,
                  requireCommentForEach: !!checked,
                })
              }
            />
            <Label>Wymagaj komentarza do każdego obrazu</Label>
          </div>

          <div>
            <Label>Dozwolone Formaty Plików</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["jpg", "jpeg", "png", "webp"].map((format) => (
                <div key={format} className="flex items-center space-x-2">
                  <Checkbox
                    checked={
                      uploadCommentOptions.allowedFormats?.includes(format) ??
                      true
                    }
                    onCheckedChange={(checked) => {
                      const currentFormats =
                        uploadCommentOptions.allowedFormats || [
                          "jpg",
                          "jpeg",
                          "png",
                          "webp",
                        ];
                      const newFormats = checked
                        ? [
                            ...currentFormats.filter((f) => f !== format),
                            format,
                          ]
                        : currentFormats.filter((f) => f !== format);
                      onOptionsChange({
                        ...uploadCommentOptions,
                        allowedFormats: newFormats,
                      });
                    }}
                  />
                  <Label className="text-sm uppercase">{format}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Video Upload Configuration
  if (questionType === "video_upload") {
    const videoOptions = (options as VideoUploadOptions) || {};

    return (
      <div className="space-y-4">
        <div>
          <Label>Instructions</Label>
          <Input
            placeholder="Instrukcje przesyłania wideo"
            value={videoOptions.instruction || ""}
            onChange={(e) =>
              onOptionsChange({ ...videoOptions, instruction: e.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Maks. Rozmiar Pliku (MB)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={Math.round(
                (videoOptions.maxSizeBytes || 52428800) / 1024 / 1024
              )}
              onChange={(e) =>
                onOptionsChange({
                  ...videoOptions,
                  maxSizeBytes:
                    (Number.parseInt(e.target.value) || 50) * 1024 * 1024,
                })
              }
            />
          </div>
          <div>
            <Label>Maks. Czas Trwania (sekundy)</Label>
            <Input
              type="number"
              min={5}
              max={300}
              value={videoOptions.maxDurationSeconds || 30}
              onChange={(e) =>
                onOptionsChange({
                  ...videoOptions,
                  maxDurationSeconds: Number.parseInt(e.target.value) || 30,
                })
              }
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={videoOptions.allowRecording || false}
            onCheckedChange={(checked) =>
              onOptionsChange({
                ...videoOptions,
                allowRecording: !!checked,
              })
            }
          />
          <Label>Zezwól na nagrywanie kamerą</Label>
        </div>
      </div>
    );
  }

  // Range Slider Configuration
  if (questionType === "range") {
    const rangeOptions = (options as RangeSliderOptions) || {};

    return (
      <div className="space-y-4">
        <div>
          <Label>Instructions</Label>
          <Input
            placeholder="Instrukcje dla suwaka"
            value={rangeOptions.instruction || ""}
            onChange={(e) =>
              onOptionsChange({ ...rangeOptions, instruction: e.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Min. Wartość</Label>
            <Input
              type="number"
              value={rangeOptions.min ?? 0}
              onChange={(e) =>
                onOptionsChange({
                  ...rangeOptions,
                  min: Number.parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <Label>Maks. Wartość</Label>
            <Input
              type="number"
              value={rangeOptions.max ?? 10}
              onChange={(e) =>
                onOptionsChange({
                  ...rangeOptions,
                  max: Number.parseInt(e.target.value) || 10,
                })
              }
            />
          </div>
          <div>
            <Label>Wielkość Kroku</Label>
            <Input
              type="number"
              step={0.1}
              min={0.1}
              value={rangeOptions.step ?? 1}
              onChange={(e) =>
                onOptionsChange({
                  ...rangeOptions,
                  step: Number.parseFloat(e.target.value) || 1,
                })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Etykieta Min.</Label>
            <Input
              placeholder="np. Zupełnie nieprawdopodobne"
              value={rangeOptions.labels?.min || ""}
              onChange={(e) =>
                onOptionsChange({
                  ...rangeOptions,
                  labels: { ...rangeOptions.labels, min: e.target.value },
                })
              }
            />
          </div>
          <div>
            <Label>Etykieta Maks.</Label>
            <Input
              placeholder="np. Bardzo prawdopodobne"
              value={rangeOptions.labels?.max || ""}
              onChange={(e) =>
                onOptionsChange({
                  ...rangeOptions,
                  labels: { ...rangeOptions.labels, max: e.target.value },
                })
              }
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={rangeOptions.showValue ?? true}
            onCheckedChange={(checked) =>
              onOptionsChange({
                ...rangeOptions,
                showValue: !!checked,
              })
            }
          />
          <Label>Pokaż bieżącą wartość</Label>
        </div>
      </div>
    );
  }

  // Video Question Configuration (admin uploads video, users respond)
  if (questionType === "video_question") {
    const videoOptions = (options as VideoQuestionOptions) || {
      responseType: "text",
      instruction: "Watch the video and share your thoughts",
    };

    const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && onVideoUpload) {
        onVideoUpload(file);
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <Label>Wideo dla Pytania</Label>
          <div className="mt-2 space-y-4">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
                id={`video-upload-${questionIndex}`}
                disabled={uploadingVideos}
              />
              <label
                htmlFor={`video-upload-${questionIndex}`}
                className={`${
                  uploadingVideos ? "cursor-not-allowed" : "cursor-pointer"
                } flex flex-col items-center justify-center space-y-2`}
              >
                {uploadingVideos ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="flex items-center space-x-2">
                      <Upload className="w-5 h-5 animate-spin" />
                      <span className="text-sm text-gray-600">
                        Przesyłanie wideo...
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Video className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Kliknij, aby przesłać wideo
                    </span>
                    <span className="text-xs text-gray-500">
                      MP4, WebM, MOV (maks. 50MB)
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Uploaded Video Preview */}
            {videoOptions.video && (
              <div className="relative">
                <video
                  src={videoOptions.video.url}
                  controls
                  className="w-full h-48 bg-gray-100 rounded border object-cover"
                >
                  Twoja przeglądarka nie obsługuje tagu wideo.
                </video>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={onRemoveVideo}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="mt-2 text-sm text-gray-600">
                  {videoOptions.video.title}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Response Configuration */}
        <div className="space-y-3">
          <div>
            <Label>Instrukcje</Label>
            <Input
              placeholder="Instrukcje dla użytkowników po obejrzeniu wideo"
              value={videoOptions.instruction || ""}
              onChange={(e) =>
                onOptionsChange({
                  ...videoOptions,
                  instruction: e.target.value,
                })
              }
            />
          </div>

          <div>
            <Label>Typ Odpowiedzi</Label>
            <Select
              value={videoOptions.responseType}
              onValueChange={(value: "text" | "video" | "both") =>
                onOptionsChange({ ...videoOptions, responseType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Odpowiedź Tekstowa</SelectItem>
                <SelectItem value="video">Odpowiedź Wideo</SelectItem>
                <SelectItem value="both">Odpowiedź Tekstowa i Wideo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(videoOptions.responseType === "text" ||
            videoOptions.responseType === "both") && (
            <div>
              <Label>Maks. Długość Tekstu</Label>
              <Input
                type="number"
                min={50}
                max={2000}
                value={videoOptions.maxTextLength || 500}
                onChange={(e) =>
                  onOptionsChange({
                    ...videoOptions,
                    maxTextLength: Number.parseInt(e.target.value) || 500,
                  })
                }
              />
            </div>
          )}

          {(videoOptions.responseType === "video" ||
            videoOptions.responseType === "both") && (
            <div className="space-y-3">
              <Label>Ustawienia Odpowiedzi Wideo</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Maks. Rozmiar Pliku (MB)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={Math.round(
                      (videoOptions.videoUploadOptions?.maxSizeBytes ||
                        52428800) /
                        1024 /
                        1024
                    )}
                    onChange={(e) =>
                      onOptionsChange({
                        ...videoOptions,
                        videoUploadOptions: {
                          ...videoOptions.videoUploadOptions,
                          maxSizeBytes:
                            (Number.parseInt(e.target.value) || 50) *
                            1024 *
                            1024,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Maks. Czas Trwania (sekundy)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    value={
                      videoOptions.videoUploadOptions?.maxDurationSeconds || 30
                    }
                    onChange={(e) =>
                      onOptionsChange({
                        ...videoOptions,
                        videoUploadOptions: {
                          ...videoOptions.videoUploadOptions,
                          maxDurationSeconds:
                            Number.parseInt(e.target.value) || 30,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
