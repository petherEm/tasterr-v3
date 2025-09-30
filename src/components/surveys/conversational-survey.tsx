"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import type {
  CustomSurveyWithQuestions,
  SurveyCategory,
  CategoryProgress,
} from "@/lib/types";
import { submitSurveyResponse } from "@/app/actions/surveys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Send,
  User,
  Bot,
  Loader2,
  X,
  Expand,
  Sparkles,
  MessageCircle,
  Camera,
} from "lucide-react";
import { ImageSortQuestion } from "@/components/questions/image-sort-question";
import { ImageSelectQuestion } from "@/components/questions/image-select-question";
import { UserImageUploadQuestion } from "@/components/questions/user-image-upload-question";
import { VideoUploadQuestion } from "@/components/questions/video-upload-question";
import { RangeSliderQuestion } from "@/components/questions/range-slider-question";

interface ConversationalSurveyProps {
  survey: CustomSurveyWithQuestions;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  questionIndex?: number;
  isQuestion?: boolean;
  isAssistance?: boolean;
  timestamp: Date;
  media?: {
    type: "images" | "image_selection" | "image_comments" | "question_images";
    images?: Array<{
      url: string;
      comment?: string;
      fileName?: string;
      alt?: string;
    }>;
    selectedImages?: any[];
    comments?: Array<[string, string]>;
    questionImages?: Array<{ url: string; alt: string; textPrompt?: string }>;
  };
}

export function ConversationalSurvey({ survey }: ConversationalSurveyProps) {
  const router = useRouter();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    alt: string;
    comment?: string;
  } | null>(null);
  const [showImageUploadChoice, setShowImageUploadChoice] = useState(false);
  const [isProcessingImageChoice, setIsProcessingImageChoice] = useState(false);
  const [showTestChat, setShowTestChat] = useState(true);
  const [testQuestion, setTestQuestion] = useState("");
  const [aiAssistanceActive, setAiAssistanceActive] = useState(false);
  const [originalAnswers, setOriginalAnswers] = useState<Record<string, any>>(
    {}
  );
  const [assistanceRetryCount, setAssistanceRetryCount] = useState<
    Record<string, number>
  >({});

  const [showImageUploadModal, setShowImageUploadModal] = useState(false);

  const form = useForm({
    defaultValues: {
      currentAnswer: "",
    },
  });

  const watch = useWatch({
    control: form.control,
    name: "currentAnswer",
  });

  const { setValue } = form; // Added setValue here

  // Helper function for handling streaming responses with proper debouncing
  const handleStreamingResponse = async (
    response: Response,
    messageId: string,
    logPrefix: string
  ) => {
    if (!response.body) {
      console.warn(`${logPrefix} - No body to stream`);
      return "";
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiResponse = "";
    let buffer = "";
    let lastUpdate = 0;

    const flush = (force = false) => {
      const now = performance.now();
      if (!force && now - lastUpdate < 16) return; // ~60fps throttle for smooth streaming
      lastUpdate = now;

      setChatMessages((prev) => {
        // Check if message already exists
        const existingIndex = prev.findIndex(m => m.id === messageId);
        if (existingIndex >= 0) {
          // Update existing message
          return prev.map((m) =>
            m.id === messageId ? { ...m, content: aiResponse } : m
          );
        } else {
          // Create new message if it doesn't exist
          return [
            ...prev,
            {
              id: messageId,
              role: "assistant",
              content: aiResponse,
              timestamp: new Date(),
            },
          ];
        }
      });
    };

    const appendToken = (raw: string) => {
      if (!raw) return;
      let token = raw;
      if (token.startsWith("data:")) token = token.slice(5);
      if (token.startsWith("0:")) token = token.slice(2);
      token = token.replace(/^\s+/, ""); // only trim leading whitespace at token boundaries
      if (
        (token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'"))
      ) {
        token = token.slice(1, -1);
      }
      token = token
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t");
      if (!token) return;
      // Avoid double spaces & ensure natural spacing if provider sends word tokens w/out leading space
      if (
        aiResponse &&
        !aiResponse.endsWith(" ") &&
        !aiResponse.endsWith("\n") &&
        !token.startsWith(" ") &&
        !/^[,.;:!?)]/.test(token)
      ) {
        aiResponse += " ";
      }
      aiResponse += token;
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trimEnd();
          buffer = buffer.slice(idx + 1);
          if (line) {
            console.debug(`${logPrefix} line:`, line);
            appendToken(line);
            flush();
          }
        }
      }
      if (buffer.trim()) {
        appendToken(buffer.trim());
      }
      flush(true);
    } catch (e) {
      console.error(`${logPrefix} - Streaming error`, e);
      flush(true);
    }

    return aiResponse;
  };

  const evaluateAiAssistance = async (answer: any, questionIndex: number) => {
    const currentQuestion = survey.questions[questionIndex];

    // Check if AI assistance is enabled for this question
    if (
      !currentQuestion.ai_assistance_enabled ||
      !currentQuestion.ai_assistance_config
    ) {
      return null;
    }

    const config = currentQuestion.ai_assistance_config;
    const questionKey = `question_${questionIndex}`;
    const retryCount = assistanceRetryCount[questionKey] || 0;

    // Check retry limit
    if (retryCount >= (config.maxRetries || 2)) {
      return null;
    }
    try {
      const response = await fetch("/api/survey-chat/assistance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: {
            id: currentQuestion.id,
            question_text: currentQuestion.question_text,
            question_type: currentQuestion.question_type,
            ai_assistance_config: config,
            category_id: currentQuestion.category_id,
          },
          answer: answer,
          previousAnswers: responses,
          surveyContext: {
            title: survey.title || "Survey",
            description: survey.description || "Survey description",
            currentCategory: currentQuestion.category_id
              ? {
                  name: currentQuestion.category_id,
                  description: "",
                }
              : undefined,
          },
          retryCount: retryCount,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI assistance API error:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const evaluation = await response.json();

      // Check if assistance is recommended
      if (evaluation.needsAssistance) {
        return {
          assistanceMessage: evaluation.feedback,
          suggestions: evaluation.suggestions || [],
          confidence: evaluation.confidence,
          assistanceType: evaluation.assistanceType,
          reasoningType: evaluation.reasoningType,
        };
      }

      return null;
    } catch (error) {
      console.error("AI assistance evaluation failed:", error);
      return null;
    }
  };

  const handleAiAssistance = async (
    assistanceResult: any,
    questionIndex: number,
    originalAnswer: any
  ) => {
    setAiAssistanceActive(true);
    setIsTyping(true);

    // Store original answer if not already stored
    const questionKey = `question_${questionIndex}`;
    if (!originalAnswers[questionKey]) {
      setOriginalAnswers((prev) => ({
        ...prev,
        [questionKey]: originalAnswer,
      }));
    }

    // Add AI assistance message to chat
    let assistanceContent = `🤖 ${assistanceResult.assistanceMessage}`;

    // Add suggestions if available
    if (
      assistanceResult.suggestions &&
      assistanceResult.suggestions.length > 0
    ) {
      assistanceContent += `\n\n💡 Here are some suggestions:\n${assistanceResult.suggestions
        .map((s: string) => `• ${s}`)
        .join("\n")}`;
    }

    setChatMessages((prev) => [
      ...prev,
      {
        id: `ai-assistance-${questionIndex}-${Date.now()}`,
        role: "assistant",
        content: assistanceContent,
        timestamp: new Date(),
        isAssistance: true,
      },
    ]);

    // Allow user to reconsider their answer
    setIsWaitingForResponse(true);
    setIsTyping(false);

    // Increment retry count
    setAssistanceRetryCount((prev) => ({
      ...prev,
      [questionKey]: (prev[questionKey] || 0) + 1,
    }));
  };

  // Initialize form for image upload questions
  useEffect(() => {
    if (currentStep >= 0 && currentStep < survey.questions.length) {
      const question = survey.questions[currentStep];

      // Reset image choice state when moving to new question
      setShowImageUploadChoice(false);
      setIsProcessingImageChoice(false);

      if (question.question_type === "image_upload_comment") {
        form.setValue("currentAnswer", []);
      } else if (
        question.question_type === "image_sort" ||
        question.question_type === "image_select"
      ) {
        form.setValue("currentAnswer", []);
      } else if (question.question_type === "range") {
        const rangeOptions = question.options as any;
        form.setValue("currentAnswer", rangeOptions?.defaultValue || 5);
      } else {
        form.setValue("currentAnswer", "");
      }
    }
  }, [currentStep, form]);

  const [aiMessages, setAiMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Category-aware progress helpers
  const getCurrentCategory = (): SurveyCategory | null => {
    if (currentStep < 0 || currentStep >= survey.questions.length) return null;
    const currentQuestion = survey.questions[currentStep];
    return (
      survey.categories?.find(
        (cat) => cat.name === currentQuestion.category_id
      ) || null
    );
  };

  const getCategoryProgress = (): CategoryProgress | null => {
    const currentCategory = getCurrentCategory();
    if (!currentCategory) return null;

    const categoryQuestions = survey.questions.filter(
      (q) => q.category_id === currentCategory.name
    );
    const currentQuestionIndexInCategory = categoryQuestions.findIndex(
      (q) => survey.questions.indexOf(q) === currentStep
    );

    const answeredInCategory = categoryQuestions.filter((q) => {
      const globalIndex = survey.questions.indexOf(q);
      return (
        globalIndex < currentStep ||
        Object.hasOwnProperty.call(responses, `question_${globalIndex}`)
      );
    }).length;

    return {
      categoryId: currentCategory.name,
      categoryName: currentCategory.name,
      currentQuestion: currentQuestionIndexInCategory + 1,
      totalQuestions: categoryQuestions.length,
      completedQuestions: answeredInCategory,
      isComplete: answeredInCategory === categoryQuestions.length,
    };
  };

  const getOverallCategoryProgress = (): {
    completed: number;
    total: number;
    categories: CategoryProgress[];
  } => {
    if (!survey.categories || survey.categories.length === 0) {
      return { completed: 0, total: 0, categories: [] };
    }

    const categoryProgresses = survey.categories.map((category) => {
      const categoryQuestions = survey.questions.filter(
        (q) => q.category_id === category.name
      );
      const answeredInCategory = categoryQuestions.filter((q) => {
        const globalIndex = survey.questions.indexOf(q);
        return (
          globalIndex < currentStep ||
          Object.hasOwnProperty.call(responses, `question_${globalIndex}`)
        );
      }).length;

      return {
        categoryId: category.name,
        categoryName: category.name,
        currentQuestion: 1,
        totalQuestions: categoryQuestions.length,
        completedQuestions: answeredInCategory,
        isComplete: answeredInCategory === categoryQuestions.length,
      };
    });

    const completedCategories = categoryProgresses.filter(
      (cp) => cp.isComplete
    ).length;

    return {
      completed: completedCategories,
      total: survey.categories.length,
      categories: categoryProgresses,
    };
  };

  // Test AI chat function
  const handleTestQuestion = async () => {
    if (!testQuestion.trim()) return;

    // Check if user wants to start survey - Polish and English phrases
    const lowerQuestion = testQuestion.toLowerCase().trim();
    const startPhrases = [
      // Polish phrases
      "tak zaczynamy",
      "zaczynamy",
      "tak",
      "ok",
      "dobrze",
      "rozpocznij",
      "rozpoczynamy",
      "start",
      "gotowy",
      "gotowa",
      "jestem gotowy",
      "jestem gotowa",
      "możemy zacząć",
      "zacznijmy",
      "dalej",
      "chodźmy",
      // English phrases
      "start survey",
      "begin",
      "let's start",
      "ready",
      "yes",
      "sure"
    ];

    const shouldStartSurvey = startPhrases.some(phrase =>
      lowerQuestion.includes(phrase) ||
      lowerQuestion === phrase ||
      (phrase.length <= 3 && lowerQuestion === phrase) // Exact match for short phrases like "tak", "ok"
    );

    if (shouldStartSurvey) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: "start-survey-user-" + Date.now(),
          role: "user",
          content: testQuestion,
          timestamp: new Date(),
        },
      ]);

      setChatMessages((prev) => [
        ...prev,
        {
          id: "start-survey-ai-" + Date.now(),
          role: "assistant",
          content:
            "Świetnie! Zaczynamy ankietę. Pozwól, że przygotuje dla Ciebie spersonalizowane wprowadzenie...",
          timestamp: new Date(),
        },
      ]);

      setTimeout(() => {
        setShowTestChat(false);
        setTestQuestion("");
      }, 1500);
      return;
    }

    console.log("Sending test question to AI:", testQuestion);
    setIsTyping(true);

    // Add user message
    setChatMessages((prev) => [
      ...prev,
      {
        id: "test-user-" + Date.now(),
        role: "user",
        content: testQuestion,
        timestamp: new Date(),
      },
    ]);

    try {
      const response = await fetch("/api/survey-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: testQuestion,
            },
          ],
          currentQuestion: {
            question_text: "Please answer the user's question about the survey",
            question_subtitle: "Be helpful and friendly",
            isFirst: true,
            index: 0,
            total: survey.questions.length,
          },
          surveyTitle: survey.title,
          surveyDescription: survey.description,
        }),
      });

      if (response.ok && response.body) {
        const aiMessageId = "test-ai-" + Date.now();

        const aiResponse = await handleStreamingResponse(
          response,
          aiMessageId,
          "Test AI"
        );

        setIsTyping(false);
        setTestQuestion("");
      } else {
        console.error("Test AI response not ok:", response.status);
        setIsTyping(false);
        setChatMessages((prev) => [
          ...prev,
          {
            id: "test-ai-error-" + Date.now(),
            role: "assistant",
            content:
              "Sorry, I'm having trouble responding right now. Let's start the survey!",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Test AI error:", error);
      setIsTyping(false);
      setChatMessages((prev) => [
        ...prev,
        {
          id: "test-ai-error-" + Date.now(),
          role: "assistant",
          content:
            "Sorry, I'm having trouble responding right now. Let's start the survey!",
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Generate AI transition message between questions
  const generateAiTransition = async (
    previousAnswer: any,
    currentQuestionIndex: number
  ) => {
    console.log("Generating AI transition message");
    setIsTyping(true);

    try {
      const response = await fetch("/api/survey-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `I just answered: ${
                typeof previousAnswer === "object"
                  ? "I provided my response"
                  : String(previousAnswer).slice(0, 100)
              }`,
            },
          ],
          currentQuestion: {
            question_text:
              "Please provide a brief, encouraging transition message to move to the next question",
            question_subtitle: "Keep it short and positive",
            isFirst: false,
            index: currentQuestionIndex,
            total: survey.questions.length,
          },
          surveyTitle: survey.title,
          surveyDescription: survey.description,
        }),
      });

      if (response.ok && response.body) {
        const transitionMessageId = "transition-" + Date.now();
        const aiResponse = await handleStreamingResponse(
          response,
          transitionMessageId,
          "AI Transition"
        );
        setIsTyping(false);
        setAiMessages((prev) => [
          ...prev,
          { role: "assistant", content: aiResponse },
        ]);
        setTimeout(() => moveToNextQuestion(previousAnswer), 1500);
      } else {
        console.error("AI transition failed, using fallback");
        setIsTyping(false);

        // Fallback transition messages
        const fallbackMessages = [
          "Awesome! Let's keep going.",
          "Thanks for that! Moving on...",
          "Great answer! Next question coming up.",
          "Perfect! Let's continue.",
          "Nice! On to the next one.",
          "Excellent! Let's move forward.",
        ];

        const randomMessage =
          fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];

        setChatMessages((prev) => [
          ...prev,
          {
            id: "transition-fallback-" + Date.now(),
            role: "assistant",
            content: randomMessage,
            timestamp: new Date(),
          },
        ]);

        setTimeout(() => {
          moveToNextQuestion(previousAnswer);
        }, 1500);
      }
    } catch (error) {
      console.error("Error generating AI transition:", error);
      setIsTyping(false);

      // Fallback transition
      const fallbackMessages = [
        "Great! Let's continue.",
        "Thanks! Next question...",
        "Perfect! Moving on.",
      ];

      const randomMessage =
        fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];

      setChatMessages((prev) => [
        ...prev,
        {
          id: "transition-error-" + Date.now(),
          role: "assistant",
          content: randomMessage,
          timestamp: new Date(),
        },
      ]);

      setTimeout(() => {
        moveToNextQuestion(previousAnswer);
      }, 1500);
    }
  };

  // Generate AI intro message
  const generateAiIntro = async () => {
    console.log("Generating AI intro message");
    setIsTyping(true);

    try {
      const response = await fetch("/api/survey-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "Cześć! Jestem gotowy/a rozpocząć ankietę.",
            },
          ],
          currentQuestion: {
            question_text: `Welcome to this survey! We have ${survey.questions.length} questions for you today.`,
            question_subtitle: "Let's get started with this conversation.",
            isFirst: true,
            index: 0,
            total: survey.questions.length,
          },
          surveyTitle: survey.title,
          surveyDescription: survey.description,
        }),
      });

      if (response.ok && response.body) {
        const introMessageId = "ai-intro-" + Date.now();

        const aiResponse = await handleStreamingResponse(
          response,
          introMessageId,
          "Survey Intro"
        );

        setIsTyping(false);

        // Move to first question after intro is complete
        setTimeout(() => {
          moveToNextQuestion();
        }, 2000);
      } else {
        // Fallback to static message if AI fails
        console.error("AI intro failed, using fallback");
        setIsTyping(false);
        setChatMessages([
          {
            id: "1",
            role: "assistant",
            content:
              survey.introduction ||
              `Welcome to "${survey.title}"! I'll guide you through this survey in a conversational way. Let's get started!`,
            timestamp: new Date(),
          },
        ]);

        setTimeout(() => {
          moveToNextQuestion();
        }, 2000);
      }
    } catch (error) {
      console.error("Error generating AI intro:", error);
      setIsTyping(false);

      // Fallback to static message
      setChatMessages([
        {
          id: "1",
          role: "assistant",
          content:
            survey.introduction ||
            `Welcome to "${survey.title}"! I'll guide you through this survey in a conversational way. Let's get started!`,
          timestamp: new Date(),
        },
      ]);

      setTimeout(() => {
        moveToNextQuestion();
      }, 2000);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showTestChat) {
        setChatMessages([
          {
            id: "welcome-test",
            role: "assistant",
            content:
              "Cześć! Jestem Twoim asystentem AI do ankiet. Zapytaj mnie o cokolwiek dotyczące ankiety zanim zaczniemy, lub napisz 'rozpocznij ankietę' żeby zacząć!",
            timestamp: new Date(),
          },
        ]);
      } else {
        generateAiIntro();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [showTestChat]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const scrollElement = chatContainerRef.current;
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [chatMessages, isTyping]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedImage(null);
      }
    };

    if (selectedImage) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [selectedImage]);

  const triggerImageUploadAI = async (
    currentImages: any[],
    maxImages: number
  ) => {
    console.log("triggerImageUploadAI called with:", {
      currentImages: currentImages.length,
      maxImages,
    });

    if (currentImages.length === 0 || currentImages.length >= maxImages) {
      console.log("Early return due to image count check");
      return;
    }

    console.log("Starting AI interaction for image uploads");
    setIsTyping(true);
    setIsProcessingImageChoice(true);

    try {
      const response = await fetch("/api/survey-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `I uploaded ${currentImages.length} image${
                currentImages.length > 1 ? "s" : ""
              } but I can upload up to ${maxImages}. What do you think?`,
            },
          ],
          currentQuestion: {
            question_text: `I see you've uploaded ${
              currentImages.length
            } great image${
              currentImages.length > 1 ? "s" : ""
            }! You can share up to ${maxImages} images total. Would you like to add ${
              maxImages - currentImages.length
            } more image${
              maxImages - currentImages.length > 1 ? "s" : ""
            } to give us more insight, or shall we move on to the next question?`,
            question_subtitle: "Your choice!",
            isFirst: false,
            index: currentStep + 1,
            total: survey.questions.length,
          },
          surveyTitle: survey.title,
          surveyDescription: survey.description,
        }),
      });

      if (response.ok && response.body) {
        const aiMessageId = "ai-image-choice-" + Date.now();
        const aiResponse = await handleStreamingResponse(
          response,
          aiMessageId,
          "AI Image Choice"
        );
        setAiMessages((prev) => [
          ...prev,
          { role: "assistant", content: aiResponse },
        ]);
        setShowImageUploadChoice(true);
      }
    } catch (error) {
      console.error("Failed to get AI response:", error);

      // Fallback message if API fails
      const fallbackResponse = `I see you've uploaded ${
        currentImages.length
      } great image${
        currentImages.length > 1 ? "s" : ""
      }! You can share up to ${maxImages} images total. Would you like to add ${
        maxImages - currentImages.length
      } more image${
        maxImages - currentImages.length > 1 ? "s" : ""
      } to give us more insight, or shall we move on to the next question?`;

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-image-choice-fallback-${Date.now()}`,
          role: "assistant",
          content: fallbackResponse,
          timestamp: new Date(),
        },
      ]);

      setShowImageUploadChoice(true);
    } finally {
      setIsTyping(false);
      setIsProcessingImageChoice(false);
    }
  };

  const handleContinueUploading = () => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `user-choice-continue-${Date.now()}`,
        role: "user",
        content: "I'd like to add more images!",
        timestamp: new Date(),
      },
    ]);

    setShowImageUploadChoice(false);
    // Keep the form in upload mode
  };

  const handleMoveToNextQuestion = () => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `user-choice-next-${Date.now()}`,
        role: "user",
        content: "Let's move to the next question.",
        timestamp: new Date(),
      },
    ]);

    setShowImageUploadChoice(false);
    setIsWaitingForResponse(false);

    const currentAnswer = form.getValues("currentAnswer");

    // Store the response and generate AI transition
    setResponses((prev) => ({
      ...prev,
      [`question_${currentStep}`]: currentAnswer,
    }));

    form.reset({ currentAnswer: "" });

    // Generate AI transition instead of static message
    setTimeout(() => {
      generateAiTransition(currentAnswer, currentStep + 1);
    }, 500);
  };

  const moveToNextQuestion = async (finalAnswer?: any) => {
    const nextStep = currentStep + 1;

    if (nextStep >= survey.questions.length) {
      handleSurveyComplete(finalAnswer);
      return;
    }

    setCurrentStep(nextStep);
    const question = survey.questions[nextStep];

    // Reset AI assistance state for new question
    setAiAssistanceActive(false);

    setIsTyping(true);
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/survey-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: aiMessages,
          currentQuestion: question,
          surveyTitle: survey.title,
          surveyDescription: survey.description,
        }),
      });

      if (response.ok && response.body) {
        const introId = `ai-intro-${nextStep}`;
        const aiResponse = await handleStreamingResponse(
          response,
          introId,
          "Question Intro"
        );
        setAiMessages((prev) => [
          ...prev,
          { role: "assistant", content: aiResponse },
        ]);
      }
    } catch (error) {
      console.error("Failed to get AI response:", error);
    } finally {
      setIsAiLoading(false);
      setIsTyping(false);
    }

    setTimeout(() => {
      // Check if question has images to display
      let questionMedia = null;
      if (question.question_type === "image_comment" && question.options) {
        try {
          const options =
            typeof question.options === "string"
              ? JSON.parse(question.options)
              : question.options;
          if (options.images && Array.isArray(options.images)) {
            questionMedia = {
              type: "question_images" as const,
              questionImages: options.images.map((img: any) => ({
                url: img.url,
                alt: img.alt || "Question image",
                textPrompt: img.textPrompt,
              })),
            };
          }
        } catch (error) {
          console.error("Error parsing question options:", error);
        }
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `question-${nextStep}`,
          role: "system",
          content: question.question_text,
          questionIndex: nextStep,
          isQuestion: true,
          media: questionMedia,
          timestamp: new Date(),
        },
      ]);

      setIsWaitingForResponse(true);
    }, 500);
  };

  const handleSurveyComplete = async (finalAnswer?: any) => {
    setIsSubmitting(true);

    try {
      const formattedResponses = survey.questions.reduce(
        (acc, question, index) => {
          const questionKey = `question_${question.id}`;
          const questionIndexKey = `question_${index}`;

          // Include the final answer - use finalAnswer for last question if provided
          const isLastQuestion = index === survey.questions.length - 1;
          acc[questionKey] =
            isLastQuestion && finalAnswer !== undefined
              ? finalAnswer
              : responses[questionIndexKey];

          // Include original answer if AI assistance was used
          if (originalAnswers[questionIndexKey]) {
            acc[`${questionKey}_original`] = originalAnswers[questionIndexKey];
            acc[`${questionKey}_ai_assisted`] = true;
            acc[`${questionKey}_ai_retries`] =
              assistanceRetryCount[questionIndexKey] || 0;
          }

          return acc;
        },
        {} as Record<string, any>
      );

      const result = await submitSurveyResponse(survey.id!, formattedResponses);

      if (result.success) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: "complete",
            role: "assistant",
            content:
              "Thank you so much for completing this survey! Your responses have been recorded and will help us greatly. 🎉",
            timestamp: new Date(),
          },
        ]);
        setIsComplete(true);
      } else {
        console.error("Failed to submit survey:", result.error);
      }
    } catch (error) {
      console.error("Failed to submit survey:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAnswerForChat = (answer: any, questionType: string) => {
    // Return object with text and media for rich display
    if (!answer) return { text: "No answer provided", media: null };

    switch (questionType) {
      case "image_upload_comment":
        if (Array.isArray(answer) && answer.length > 0) {
          return {
            text: `Przesłano ${answer.length} zdję${
              answer.length === 1 ? "cie" : answer.length < 5 ? "cia" : "ć"
            } z komentarzami`,
            media: {
              type: "images",
              images: answer.map((img: any) => ({
                url: img.url,
                comment: img.comment,
                fileName: img.fileName,
              })),
            },
          };
        }
        return { text: "Nie przesłano zdjęć", media: null };

      case "image_sort":
      case "image_select":
        if (Array.isArray(answer) && answer.length > 0) {
          return {
            text: `Wybrano ${answer.length} zdję${
              answer.length === 1 ? "cie" : answer.length < 5 ? "cia" : "ć"
            }`,
            media: {
              type: "image_selection",
              selectedImages: answer,
            },
          };
        }
        return { text: "Nie wybrano zdjęć", media: null };

      case "image_comment":
        if (typeof answer === "object" && answer !== null) {
          const comments = Object.entries(answer).filter(
            ([id, comment]) => comment && String(comment).trim()
          );
          return {
            text: `Dodano komentarze do ${comments.length} zdję${
              comments.length === 1 ? "cia" : comments.length < 5 ? "ć" : "ć"
            }`,
            media: {
              type: "image_comments",
              comments: comments,
            },
          };
        } else if (typeof answer === "string" && answer.trim()) {
          // Handle case where answer is a simple string (current fallback behavior)
          return {
            text: `Comment: "${answer.trim()}"`,
            media: null,
          };
        }
        return { text: "Nie dodano komentarzy", media: null };

      case "range":
        return { text: `Selected: ${answer}`, media: null };

      case "video_upload":
        return {
          text: answer ? "Video uploaded" : "No video uploaded",
          media: null,
        };

      case "radio":
      case "select":
        return { text: String(answer), media: null };

      default:
        const text =
          typeof answer === "object"
            ? "Response provided"
            : String(answer).length > 100
            ? String(answer).slice(0, 100) + "..."
            : String(answer);
        return { text, media: null };
    }
  };

  const handleAnswerSubmit = (data: any) => {
    if (!isWaitingForResponse || currentStep < 0) return;

    const currentQuestion = survey.questions[currentStep];
    const answer = data.currentAnswer;
    const formattedResponse = formatAnswerForChat(
      answer,
      currentQuestion.question_type
    );

    setChatMessages((prev) => [
      ...prev,
      {
        id: `answer-${currentStep}-${Date.now()}`,
        role: "user",
        content: formattedResponse.text,
        media: formattedResponse.media,
        timestamp: new Date(),
      },
    ]);

    // Store response temporarily (will be final if no AI assistance)
    setResponses((prev) => ({
      ...prev,
      [`question_${currentStep}`]: answer,
    }));

    form.reset({ currentAnswer: "" });

    // Check if AI assistance is needed
    const checkAiAssistance = async () => {
      const assistanceResult = await evaluateAiAssistance(answer, currentStep);

      if (assistanceResult) {
        // AI assistance is recommended
        await handleAiAssistance(assistanceResult, currentStep, answer);
      } else {
        // No AI assistance needed, proceed normally
        setAiAssistanceActive(false);
        setIsWaitingForResponse(false);
        setTimeout(() => {
          generateAiTransition(answer, currentStep + 1);
        }, 500);
      }
    };

    checkAiAssistance();
  };

  const renderQuestionInput = () => {
    const currentQuestion = survey.questions[currentStep];
    if (!currentQuestion) return null;

    const watch = form.watch("currentAnswer");

    switch (currentQuestion.question_type) {
      case "input":
        return (
          <div className="flex-1 space-y-2">
            <Input
              placeholder={
                aiAssistanceActive
                  ? "Refine your answer or confirm..."
                  : "Wpisz swoją odpowiedź..."
              }
              {...form.register("currentAnswer")}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  form.handleSubmit(handleAnswerSubmit)();
                }
              }}
              className={`flex-1 ${
                aiAssistanceActive ? "border-blue-300 bg-blue-50" : ""
              }`}
              autoFocus
            />
            {aiAssistanceActive && (
              <div className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-blue-500" />
                <span className="text-blue-600">
                  AI is helping improve your answer
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAiAssistanceActive(false);
                    setIsWaitingForResponse(false);
                    form.reset({ currentAnswer: "" });
                    setTimeout(() => {
                      generateAiTransition(
                        responses[`question_${currentStep}`],
                        currentStep + 1
                      );
                    }, 500);
                  }}
                >
                  Zachowaj Oryginalną Odpowiedź
                </Button>
              </div>
            )}
          </div>
        );

      case "textarea":
        return (
          <div className="w-full space-y-2">
            <Textarea
              placeholder={
                aiAssistanceActive
                  ? "Refine your answer or provide more details..."
                  : "Wpisz szczegółową odpowiedź..."
              }
              {...form.register("currentAnswer")}
              rows={3}
              className={`w-full resize-none ${
                aiAssistanceActive ? "border-blue-300 bg-blue-50" : ""
              }`}
            />
            {aiAssistanceActive && (
              <div className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-blue-500" />
                <span className="text-blue-600">
                  AI is helping improve your answer
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAiAssistanceActive(false);
                    setIsWaitingForResponse(false);
                    form.reset({ currentAnswer: "" });
                    setTimeout(() => {
                      generateAiTransition(
                        responses[`question_${currentStep}`],
                        currentStep + 1
                      );
                    }, 500);
                  }}
                >
                  Zachowaj Oryginalną Odpowiedź
                </Button>
              </div>
            )}
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            placeholder="Enter a number..."
            {...form.register("currentAnswer")}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                form.handleSubmit(handleAnswerSubmit)();
              }
            }}
            className="flex-1"
            autoFocus
          />
        );

      case "select":
        let selectOptions: any[] = [];
        try {
          selectOptions =
            typeof currentQuestion.options === "string"
              ? JSON.parse(currentQuestion.options)
              : Array.isArray(currentQuestion.options)
              ? currentQuestion.options
              : [];
        } catch (error) {
          console.error("Failed to parse select options:", error);
          selectOptions = [];
        }
        return (
          <div className="flex-1">
            <Select
              onValueChange={(value) => {
                setValue("currentAnswer", value);
                setTimeout(() => {
                  form.handleSubmit(handleAnswerSubmit)();
                }, 100);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {selectOptions?.map((option: any, index: number) => (
                  <SelectItem
                    key={`${option.value}-${index}`}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "radio":
        let radioOptions: any[] = [];
        try {
          radioOptions =
            typeof currentQuestion.options === "string"
              ? JSON.parse(currentQuestion.options)
              : Array.isArray(currentQuestion.options)
              ? currentQuestion.options
              : [];
        } catch (error) {
          console.error("Failed to parse radio options:", error);
          radioOptions = [];
        }
        return (
          <RadioGroup
            onValueChange={(value) => {
              setValue("currentAnswer", value);
              setTimeout(() => {
                form.handleSubmit(handleAnswerSubmit)();
              }, 100);
            }}
            className="w-full space-y-2"
          >
            {radioOptions?.map((option: any, index: number) => (
              <div
                key={`${option.value}-${index}`}
                className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
              >
                <RadioGroupItem
                  value={option.value}
                  id={`${option.value}-${index}`}
                />
                <Label
                  htmlFor={`${option.value}-${index}`}
                  className="flex-1 cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "range":
        return (
          <div className="w-full">
            <RangeSliderQuestion
              question={currentQuestion}
              value={watch}
              onChange={(value) => {
                setValue("currentAnswer", value);
              }}
            />
          </div>
        );

      case "image_sort":
        return (
          <div className="w-full">
            <ImageSortQuestion
              question={currentQuestion}
              value={watch}
              onChange={(value) => {
                setValue("currentAnswer", value);
              }}
            />
          </div>
        );

      case "image_select":
        return (
          <div className="w-full">
            <ImageSelectQuestion
              question={currentQuestion}
              value={watch}
              onChange={(value) => {
                setValue("currentAnswer", value);
              }}
            />
          </div>
        );

      case "image_upload_comment":
        return (
          <div className="w-full space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium">
                📸 Prześlij zdjęcia i dodaj komentarze do każdego
              </p>
            </div>

            <div className="text-center py-8">
              <Button
                type="button"
                onClick={() => setShowImageUploadModal(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Camera className="w-5 h-5 mr-2" />
                {Array.isArray(watch) && watch.length > 0
                  ? `Zarządzaj Zdjęciami (${watch.length})`
                  : "Prześlij Zdjęcia"}
              </Button>

              {Array.isArray(watch) && watch.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {watch.slice(0, 3).map((img: any, index: number) => (
                    <img
                      key={img.id}
                      src={img.url || "/placeholder.svg"}
                      alt={`Preview ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border-2 border-blue-200 shadow-sm"
                    />
                  ))}
                  {watch.length > 3 && (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center text-xs text-gray-600">
                      +{watch.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>

            {watch && Array.isArray(watch) && watch.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✅ {watch.length} image
                  {watch.length > 1 ? "s" : ""} uploaded
                  {watch.every((img: any) => img.comment && img.comment.trim())
                    ? " with comments"
                    : ` (${
                        watch.filter(
                          (img: any) => img.comment && img.comment.trim()
                        ).length
                      } with comments)`}
                </p>
              </div>
            )}
          </div>
        );

      case "video_upload":
        return (
          <div className="w-full">
            <VideoUploadQuestion
              question={currentQuestion}
              value={watch}
              onChange={(value) => {
                setValue("currentAnswer", value);
              }}
            />
          </div>
        );

      default:
        return (
          <Input
            placeholder="Wpisz swoją odpowiedź..."
            {...form.register("currentAnswer")}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                form.handleSubmit(handleAnswerSubmit)();
              }
            }}
            className="flex-1"
            autoFocus
          />
        );
    }
  };

  const canSubmitAnswer = () => {
    const currentAnswer = watch;

    if (currentStep < 0 || currentStep >= survey.questions.length) return false;

    const currentQuestion = survey.questions[currentStep];

    // If not required and no answer, allow submission
    if (
      !currentQuestion.is_required &&
      (!currentAnswer ||
        (Array.isArray(currentAnswer) && currentAnswer.length === 0) ||
        (typeof currentAnswer === "string" && currentAnswer.trim() === ""))
    ) {
      return true;
    }

    switch (currentQuestion.question_type) {
      case "image_sort":
      case "image_select":
        return Array.isArray(currentAnswer) && currentAnswer.length > 0;

      case "image_upload_comment":
        if (!Array.isArray(currentAnswer) || currentAnswer.length === 0)
          return false;
        // Check if comments are required and provided
        const options = currentQuestion.options as any;
        if (options?.requireCommentForEach) {
          return currentAnswer.every(
            (img: any) =>
              img.comment &&
              typeof img.comment === "string" &&
              img.comment.trim() !== ""
          );
        }
        return true;

      case "image_comment":
        if (typeof currentAnswer === "object" && currentAnswer !== null) {
          const comments = Object.values(currentAnswer);
          return comments.every(
            (comment: any) =>
              typeof comment === "string" && comment.trim() !== ""
          );
        } else if (typeof currentAnswer === "string") {
          return currentAnswer.trim() !== "";
        }
        return false;

      case "range":
        return typeof currentAnswer === "number";

      case "video_upload":
        return currentAnswer !== null && currentAnswer !== undefined;

      case "select":
      case "radio":
        return currentAnswer && String(currentAnswer).trim() !== "";

      default:
        return currentAnswer && String(currentAnswer).trim() !== "";
    }
  };

  const isAnswerValid = () => {
    const currentAnswer = watch;
    const currentQuestion = survey.questions[currentStep];

    if (!currentQuestion.is_required) return true;

    switch (currentQuestion.question_type) {
      case "image_sort":
      case "image_select":
        return Array.isArray(currentAnswer) && currentAnswer.length > 0;

      case "image_upload_comment":
        if (!Array.isArray(currentAnswer) || currentAnswer.length === 0)
          return false;
        // Check if comments are required and provided
        const options = currentQuestion.options as any;
        if (options?.requireCommentForEach) {
          return currentAnswer.every(
            (img: any) =>
              img.comment &&
              typeof img.comment === "string" &&
              img.comment.trim() !== ""
          );
        }
        return true;

      case "image_comment":
        if (typeof currentAnswer === "object" && currentAnswer !== null) {
          const comments = Object.values(currentAnswer);
          return comments.every(
            (comment: any) =>
              typeof comment === "string" && comment.trim() !== ""
          );
        } else if (typeof currentAnswer === "string") {
          return currentAnswer.trim() !== "";
        }
        return false;

      case "range":
        return typeof currentAnswer === "number";

      case "video_upload":
        return currentAnswer !== null && currentAnswer !== undefined;

      case "select":
      case "radio":
        return currentAnswer && String(currentAnswer).trim() !== "";

      default:
        return currentAnswer && String(currentAnswer).trim() !== "";
    }
  };

  if (isComplete) {
    return (
      <div className="h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-3xl font-black text-gray-900 mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Ankieta Ukończona! 🎉
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed text-lg">
              Thank you for sharing your valuable insights with us. Your
              responses help us create better experiences.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              onClick={() => router.push("/surveys")}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Explore More Surveys
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-white to-blue-50">
      {/* Test Chat Mode */}
      {showTestChat && (
        <div className="h-screen flex flex-col">
          <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
            <div className="max-w-4xl mx-auto p-3">
              <div className="bg-gradient-to-r from-[#94B2F9] to-[#7A9EF8] rounded-xl p-3 shadow-lg">
                <h1 className="text-lg font-black text-white mb-1 truncate">
                  🤖 AI Test Chat - {survey.title}
                </h1>
                <p className="text-white/90 text-xs">
                  Test the AI integration before starting the survey
                </p>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-hidden">
            <div className="max-w-4xl mx-auto h-full p-3 md:p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl border border-gray-200/50 h-full flex flex-col"
              >
                {/* Chat Messages */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6"
                >
                  <AnimatePresence mode="popLayout">
                    {chatMessages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className={`flex items-start gap-2 md:gap-3 ${
                          message.role === "user"
                            ? "flex-row-reverse"
                            : "flex-row"
                        }`}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1 }}
                          className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                            message.role === "user"
                              ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                              : "bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300"
                          }`}
                        >
                          {message.role === "user" ? (
                            <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
                          ) : (
                            <Bot className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                          )}
                        </motion.div>

                        <div
                          className={`max-w-[85%] md:max-w-[75%] rounded-2xl md:rounded-3xl px-3 py-2.5 md:px-5 md:py-3.5 shadow-lg ${
                            message.role === "user"
                              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                              : "bg-white border border-gray-200 text-gray-800"
                          }`}
                        >
                          <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <div
                            className={`text-xs md:text-sm mt-1.5 md:mt-2 ${
                              message.role === "user"
                                ? "text-indigo-100"
                                : "text-gray-500"
                            }`}
                          >
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Enhanced typing indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 md:gap-3"
                    >
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 flex items-center justify-center shrink-0 shadow-lg">
                        <Bot className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl px-4 py-3 md:px-5 md:py-3.5 shadow-lg">
                        <div className="flex gap-1.5">
                          <motion.div
                            className="w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              repeat: Number.POSITIVE_INFINITY,
                              duration: 0.8,
                            }}
                          />
                          <motion.div
                            className="w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              repeat: Number.POSITIVE_INFINITY,
                              duration: 0.8,
                              delay: 0.2,
                            }}
                          />
                          <motion.div
                            className="w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              repeat: Number.POSITIVE_INFINITY,
                              duration: 0.8,
                              delay: 0.4,
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Enhanced Test Input Area */}
                <div className="border-t border-gray-200/50 p-3 md:p-6 bg-gray-50/50">
                  <div className="flex gap-2 md:gap-3">
                    <input
                      type="text"
                      value={testQuestion}
                      onChange={(e) => setTestQuestion(e.target.value)}
                      placeholder="Ask me anything..."
                      className="flex-1 px-3 py-2.5 md:px-5 md:py-3.5 border border-gray-300 rounded-xl md:rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm text-sm md:text-base transition-all duration-200"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !isTyping) {
                          handleTestQuestion();
                        }
                      }}
                      disabled={isTyping}
                    />
                    <Button
                      onClick={handleTestQuestion}
                      disabled={!testQuestion.trim() || isTyping}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2.5 md:px-6 md:py-3.5 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                      <Send className="w-4 h-4 md:w-5 md:h-5" />
                    </Button>
                  </div>
                  <div className="mt-3 md:mt-4 text-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTestChat(false);
                        setTestQuestion("");
                      }}
                      className="text-sm md:text-base border-2 border-gray-300 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl md:rounded-2xl px-4 py-2 md:px-6 md:py-3 transition-all duration-200"
                    >
                      <span className="hidden sm:inline">Pomiń Test i Rozpocznij Ankietę</span>
                      <span className="sm:hidden">Rozpocznij Ankietę</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}

      {/* Regular Survey Mode */}
      {!showTestChat && (
        <>
          <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
            <div className="max-w-4xl mx-auto p-3">
              <div className="bg-gradient-to-r from-[#94B2F9] to-[#7A9EF8] rounded-xl p-3 shadow-lg">
                <h1 className="text-lg font-black text-white mb-1 truncate">
                  {survey.title}
                </h1>
                {survey.description && (
                  <p className="text-white/90 text-xs line-clamp-1 leading-relaxed">
                    {survey.description}
                  </p>
                )}
              </div>

              <div className="mt-2">
                {(() => {
                  const currentCategory = getCurrentCategory();
                  const categoryProgress = getCategoryProgress();
                  const overallProgress = getOverallCategoryProgress();

                  if (currentStep < 0) {
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700">
                          Getting started...
                        </span>
                        <span className="text-xs text-gray-500">
                          {survey.questions.length} questions
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700">
                          {currentCategory
                            ? `${currentCategory.name}`
                            : "Survey Progress"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {currentStep + 1} of {survey.questions.length}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {currentCategory && (
                          <div className="flex items-center gap-2">
                            <Progress
                              value={
                                categoryProgress
                                  ? (categoryProgress.completedQuestions /
                                      categoryProgress.totalQuestions) *
                                    100
                                  : 0
                              }
                              className="flex-1 h-1.5"
                            />
                            <span className="text-xs text-gray-500 min-w-[3rem]">
                              {categoryProgress
                                ? Math.round(
                                    (categoryProgress.completedQuestions /
                                      categoryProgress.totalQuestions) *
                                      100
                                  )
                                : 0}
                              %
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Progress
                            value={
                              currentStep >= 0
                                ? ((currentStep + 1) /
                                    survey.questions.length) *
                                  100
                                : 0
                            }
                            className="flex-1 h-1"
                          />
                          <span className="text-xs text-gray-400 min-w-[3rem]">
                            Overall{" "}
                            {currentStep >= 0
                              ? Math.round(
                                  ((currentStep + 1) /
                                    survey.questions.length) *
                                    100
                                )
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6"
              style={{ scrollBehavior: "smooth" }}
            >
              <AnimatePresence mode="popLayout">
                {chatMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-2 md:gap-3 max-w-[90%] md:max-w-[85%] ${
                        message.role === "user" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                          message.role === "user"
                            ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                            : "bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
                        )}
                      </motion.div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <motion.div
                          initial={{
                            opacity: 0,
                            x: message.role === "user" ? 20 : -20,
                          }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 }}
                          className={`rounded-2xl md:rounded-3xl px-3 py-2.5 md:px-5 md:py-3.5 shadow-lg ${
                            message.role === "user"
                              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                              : message.isQuestion
                              ? "bg-gradient-to-br from-white to-indigo-50 border-2 border-indigo-200 text-gray-900"
                              : "bg-white border border-gray-200 text-gray-800 shadow-lg"
                          }`}
                        >
                          {message.isQuestion && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 }}
                              className="flex items-center gap-2 mb-2 md:mb-3"
                            >
                              <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse"></div>
                              <span className="text-xs md:text-sm font-bold text-indigo-600 uppercase tracking-wider">
                                Question {(message.questionIndex || 0) + 1}
                              </span>
                            </motion.div>
                          )}

                          <p
                            className={`leading-relaxed ${
                              message.isQuestion
                                ? "font-semibold text-base md:text-lg"
                                : "text-sm md:text-base"
                            }`}
                          >
                            {message.content}
                          </p>

                          {/* Enhanced media display */}
                          {message.media && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 }}
                              className="mt-6"
                            >
                              {message.media.type === "images" &&
                                message.media.images && (
                                  <div className="space-y-4">
                                    {message.media.images.map((img, index) => (
                                      <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1 * index }}
                                        className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-200 shadow-lg"
                                      >
                                        <div
                                          className="relative group cursor-pointer overflow-hidden rounded-xl"
                                          onClick={() =>
                                            setSelectedImage({
                                              url:
                                                img.url || "/placeholder.svg",
                                              alt:
                                                img.fileName ||
                                                `Przesłane zdjęcie ${
                                                  index + 1
                                                }`,
                                              comment: img.comment,
                                            })
                                          }
                                        >
                                          <img
                                            src={img.url || "/placeholder.svg"}
                                            alt={
                                              img.fileName ||
                                              `Przesłane zdjęcie ${index + 1}`
                                            }
                                            className="w-full max-w-sm h-56 object-cover shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                              <Expand className="w-6 h-6 text-gray-700" />
                                            </div>
                                          </div>
                                        </div>
                                        {img.comment && (
                                          <div className="mt-4 text-base text-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                                            <span className="font-semibold text-indigo-600 flex items-center gap-2">
                                              <MessageCircle className="w-4 h-4" />
                                              Comment:
                                            </span>
                                            <p className="mt-2">
                                              {img.comment}
                                            </p>
                                          </div>
                                        )}
                                      </motion.div>
                                    ))}
                                  </div>
                                )}

                              {/* Enhanced question images display */}
                              {message.media.type === "question_images" &&
                                message.media.questionImages && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                                    {message.media.questionImages.map(
                                      (img, index) => (
                                        <motion.div
                                          key={index}
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.1 * index }}
                                          className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
                                        >
                                          <div
                                            className="relative group cursor-pointer"
                                            onClick={() =>
                                              setSelectedImage({
                                                url:
                                                  img.url || "/placeholder.svg",
                                                alt: img.alt,
                                                comment: img.textPrompt,
                                              })
                                            }
                                          >
                                            <img
                                              src={
                                                img.url || "/placeholder.svg"
                                              }
                                              alt={img.alt}
                                              className="w-full h-48 object-cover transition-all duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                              <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                <Expand className="w-5 h-5 text-gray-700" />
                                              </div>
                                            </div>
                                          </div>
                                          {img.textPrompt && (
                                            <div className="p-4 text-sm text-gray-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-gray-100">
                                              {img.textPrompt}
                                            </div>
                                          )}
                                        </motion.div>
                                      )
                                    )}
                                  </div>
                                )}

                              {message.media.type === "image_comments" &&
                                message.media.comments && (
                                  <div className="space-y-3 mt-6">
                                    {message.media.comments.map(
                                      ([imageId, comment], index) => (
                                        <motion.div
                                          key={index}
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: 0.1 * index }}
                                          className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 text-base border border-indigo-100"
                                        >
                                          <span className="font-semibold text-indigo-600 flex items-center gap-2">
                                            <Camera className="w-4 h-4" />
                                            Image {index + 1}:
                                          </span>
                                          <p className="mt-2 text-gray-700">
                                            {comment}
                                          </p>
                                        </motion.div>
                                      )
                                    )}
                                  </div>
                                )}
                            </motion.div>
                          )}
                        </motion.div>

                        <div
                          className={`text-xs md:text-sm text-gray-400 mt-1.5 md:mt-2 px-1 ${
                            message.role === "user" ? "text-right" : "text-left"
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Enhanced typing indicator */}
                {(isTyping || isAiLoading) && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-start gap-2 md:gap-3 max-w-[90%] md:max-w-[85%]">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 shadow-lg shrink-0">
                        <Bot className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
                      </div>
                      <div className="rounded-2xl md:rounded-3xl px-4 py-3 md:px-5 md:py-3.5 bg-white border border-gray-200 shadow-lg">
                        <div className="flex gap-1.5">
                          <motion.div
                            className="w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              repeat: Number.POSITIVE_INFINITY,
                              duration: 0.8,
                            }}
                          />
                          <motion.div
                            className="w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              repeat: Number.POSITIVE_INFINITY,
                              duration: 0.8,
                              delay: 0.2,
                            }}
                          />
                          <motion.div
                            className="w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              repeat: Number.POSITIVE_INFINITY,
                              duration: 0.8,
                              delay: 0.4,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Enhanced input area */}
            {currentStep >= 0 && currentStep < survey.questions.length && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/95 backdrop-blur-xl border-t border-gray-200/50 shadow-2xl"
              >
                <div className="max-w-4xl mx-auto p-3 md:p-6">
                  <form
                    onSubmit={form.handleSubmit(handleAnswerSubmit)}
                    className="space-y-3 md:space-y-4"
                  >
                    {/* Enhanced input area with better styling */}
                    <div className="bg-white rounded-xl md:rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
                      <div className="p-3 md:p-5 max-h-80 overflow-y-auto">
                        {renderQuestionInput()}
                      </div>
                    </div>

                    {/* AI Choice buttons for image uploads */}
                    {showImageUploadChoice &&
                      survey.questions[currentStep].question_type ===
                        "image_upload_comment" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl md:rounded-2xl p-3 md:p-5 shadow-lg"
                        >
                          <p className="text-sm md:text-base text-blue-800 mb-3 md:mb-4 font-semibold flex items-center gap-2">
                            <Bot className="w-4 h-4 md:w-5 md:h-5" />
                            What would you like to do next?
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                            <Button
                              type="button"
                              onClick={handleContinueUploading}
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                              disabled={isSubmitting}
                            >
                              <Camera className="w-5 h-5 mr-2" />
                              Dodaj więcej zdjęć
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleMoveToNextQuestion}
                              className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 bg-transparent"
                              disabled={isSubmitting}
                            >
                              <Send className="w-5 h-5 mr-2" />
                              Continue to next question
                            </Button>
                          </div>
                        </motion.div>
                      )}

                    {/* Enhanced action buttons */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex gap-2 md:gap-3">
                        {/* Skip option for image uploads after first image */}
                        {survey.questions[currentStep].question_type ===
                          "image_upload_comment" &&
                          Array.isArray(watch) &&
                          watch.length > 0 &&
                          watch.length >=
                            (survey.questions[currentStep].options as any)
                              ?.minImages &&
                          !showImageUploadChoice && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleAnswerSubmit({ currentAnswer: watch })
                              }
                              className="text-gray-600 border-2 border-gray-300 hover:bg-gray-50 rounded-xl px-4 py-2 transition-all duration-200"
                              disabled={isSubmitting}
                            >
                              Pomiń dalsze przesłanie
                            </Button>
                          )}

                        {/* Regular skip for non-required questions */}
                        {!survey.questions[currentStep].is_required &&
                          survey.questions[currentStep].question_type !==
                            "image_upload_comment" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleAnswerSubmit({ currentAnswer: "" })
                              }
                              className="text-gray-500 hover:bg-gray-100 rounded-xl px-4 py-2 transition-all duration-200"
                              disabled={isSubmitting}
                            >
                              Pomiń
                            </Button>
                          )}
                      </div>

                      <div className="flex items-center gap-2 md:gap-3">
                        {/* Enhanced validation status */}
                        {isAnswerValid() && !showImageUploadChoice && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="hidden sm:flex text-sm md:text-base text-green-600 items-center gap-2 bg-green-50 px-2 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-green-200"
                          >
                            <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="hidden md:inline">Ready to continue</span>
                            <span className="md:hidden">Ready</span>
                          </motion.span>
                        )}

                        {/* Enhanced submit button */}
                        {!showImageUploadChoice && (
                          <Button
                            type="submit"
                            disabled={!isAnswerValid() || isSubmitting}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2.5 md:px-8 md:py-4 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 text-sm md:text-base"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin mr-1.5 md:mr-2" />
                                <span className="hidden sm:inline">Wysyłanie...</span>
                                <span className="sm:hidden">...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
                                <span>Continue</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Enhanced error message */}
                    {survey.questions[currentStep].is_required &&
                      !isAnswerValid() && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-base text-red-600 px-4 py-3 flex items-center gap-3 bg-red-50 rounded-xl border border-red-200"
                        >
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span>
                            {survey.questions[currentStep].question_type ===
                            "image_upload_comment"
                              ? "Proszę przesłać co najmniej jedno zdjęcie i dodać komentarze"
                              : "This question is required"}
                          </span>
                        </motion.div>
                      )}
                  </form>
                </div>
              </motion.div>
            )}
          </div>

          <Dialog
            open={showImageUploadModal}
            onOpenChange={setShowImageUploadModal}
          >
            <DialogContent className="max-w-4xl w-full max-h-[90vh] p-0 bg-white border-0 rounded-2xl overflow-hidden flex flex-col">
              <DialogHeader className="p-6 pb-4 border-b border-gray-100 shrink-0">
                <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Camera className="w-6 h-6 text-indigo-500" />
                  Upload & Comment on Images
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6">
                <UserImageUploadQuestion
                  question={survey.questions[currentStep]}
                  value={form.watch("currentAnswer") || []}
                  onChange={(value) => {
                    form.setValue("currentAnswer", value);
                    form.trigger("currentAnswer");

                    // Check if we should trigger AI interaction for more uploads
                    const options = survey.questions[currentStep]
                      .options as any;
                    const maxImages = options?.maxImages || 1;
                    const minImages = options?.minImages || 1;

                    if (
                      Array.isArray(value) &&
                      value.length >= minImages &&
                      value.length < maxImages &&
                      !showImageUploadChoice &&
                      !isProcessingImageChoice &&
                      value.every(
                        (img: any) => img.comment && img.comment.trim()
                      )
                    ) {
                      setTimeout(() => {
                        triggerImageUploadAI(value, maxImages);
                      }, 1000);
                    }
                  }}
                />
              </div>

              <div className="p-6 pt-4 border-t border-gray-100 bg-white shrink-0">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {Array.isArray(form.watch("currentAnswer")) &&
                    form.watch("currentAnswer").length > 0
                      ? `${form.watch("currentAnswer").length} zdjęcie/ć gotowe`
                      : ""}
                  </div>

                  <Button
                    onClick={() => setShowImageUploadModal(false)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Dalej
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Enhanced Image Enlargement Modal */}
          <Dialog
            open={!!selectedImage}
            onOpenChange={() => setSelectedImage(null)}
          >
            <DialogContent className="max-w-[95vw] w-full max-h-[95vh] p-0 bg-black/95 border-0 rounded-3xl overflow-hidden">
              <DialogHeader className="absolute top-8 left-8 z-10">
                <DialogTitle className="text-white text-2xl font-bold drop-shadow-2xl">
                  {selectedImage?.alt || "Image Preview"}
                </DialogTitle>
              </DialogHeader>

              {selectedImage && (
                <div className="relative flex flex-col h-full min-h-[95vh]">
                  {/* Enhanced close button */}
                  <Button
                    variant="ghost"
                    size="lg"
                    className="absolute top-8 right-8 z-10 bg-black/60 hover:bg-black/80 text-white border-2 border-white/30 rounded-2xl h-14 w-14 p-0 shadow-2xl backdrop-blur-sm"
                    onClick={() => setSelectedImage(null)}
                  >
                    <X className="h-7 w-7" />
                  </Button>

                  {/* Image container */}
                  <div className="flex-1 flex items-center justify-center p-12">
                    <motion.img
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      src={selectedImage.url}
                      alt={selectedImage.alt}
                      className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Enhanced comment section */}
                  {selectedImage.comment && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white/98 backdrop-blur-xl p-8 border-t border-gray-200"
                    >
                      <div className="max-w-4xl mx-auto">
                        <p className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                          <MessageCircle className="w-6 h-6 text-indigo-500" />
                          Comment:
                        </p>
                        <p className="text-gray-900 leading-relaxed text-xl">
                          {selectedImage.comment}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
