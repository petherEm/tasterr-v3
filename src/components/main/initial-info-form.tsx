"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { submitSurvey } from "@/app/actions/survey";
import type { UserSurvey } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft, CheckCircle, Sparkles } from "lucide-react";

const surveySchema = z.object({
  age: z.string().optional(),
  gender: z.string().optional(),
  citySize: z.string().min(1, "Proszę wybrać wielkość swojego miasta"),
  shoppingFrequency: z.string().min(1, "Proszę wybrać jak często robisz zakupy"),
  preferredBrand: z.string().optional(),
  profession: z.string().min(1, "Proszę podać swój zawód"),
});

type SurveyData = z.infer<typeof surveySchema>;

const questions = [
  {
    id: "age",
    title: "Ile masz lat?",
    subtitle: "To pomaga nam lepiej poznać naszą publiczność",
    optional: true,
    type: "input" as const,
  },
  {
    id: "gender",
    title: "Potwierdź swoją płeć",
    subtitle: "Opcjonalnie - tylko jeśli czujesz się komfortowo dzieląc się tym",
    optional: true,
    type: "select" as const,
    options: [
      { value: "male", label: "Mężczyzna" },
      { value: "female", label: "Kobieta" },
      { value: "non-binary", label: "Niebinarna" },
      { value: "prefer-not-to-say", label: "Wolę nie mówić" },
    ],
  },
  {
    id: "citySize",
    title: "Gdzie mieszkasz?",
    subtitle: "Powiedz nam o wielkości Twojego miasta",
    optional: false,
    type: "radio" as const,
    options: [
      { value: "small-town", label: "Małe miasto (poniżej 50 tys. mieszkańców)" },
      { value: "medium-city", label: "Średnie miasto (50 tys. - 200 tys. mieszkańców)" },
      { value: "large-city", label: "Duże miasto (200 tys. - 1 mln mieszkańców)" },
      { value: "major-metro", label: "Duża metropolia (ponad 1 mln mieszkańców)" },
    ],
  },
  {
    id: "shoppingFrequency",
    title: "Jak często robisz zakupy?",
    subtitle: "Uwzględnij zakupy online i w sklepach stacjonarnych",
    optional: false,
    type: "select" as const,
    options: [
      { value: "daily", label: "Codziennie" },
      { value: "few-times-week", label: "Kilka razy w tygodniu" },
      { value: "weekly", label: "Raz w tygodniu" },
      { value: "bi-weekly", label: "Co 2 tygodnie" },
      { value: "monthly", label: "Raz w miesiącu" },
      { value: "rarely", label: "Rzadko" },
    ],
  },
  {
    id: "preferredBrand",
    title: "Czy masz preferowaną markę sklepu?",
    subtitle: "Opcjonalnie - powiedz nam o swoim ulubionym sklepie",
    optional: true,
    type: "input" as const,
  },
  {
    id: "profession",
    title: "Jaki jest Twój zawód?",
    subtitle: "Pomóż nam zrozumieć Twoje wykształcenie",
    optional: false,
    type: "input" as const,
  },
];

interface SurveyFormProps {
  existingSurvey?: UserSurvey;
  onComplete?: (survey: UserSurvey) => void;
  onCancel?: () => void;
}

export default function SurveyForm({
  existingSurvey,
  onComplete,
  onCancel,
}: SurveyFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!existingSurvey;

  const form = useForm<SurveyData>({
    resolver: zodResolver(surveySchema),
    defaultValues: existingSurvey
      ? {
          age: existingSurvey.age || "",
          gender: existingSurvey.gender || "",
          citySize: existingSurvey.city_size,
          shoppingFrequency: existingSurvey.shopping_frequency,
          preferredBrand: existingSurvey.preferred_brand || "",
          profession: existingSurvey.profession,
        }
      : {
          age: "",
          gender: "",
          citySize: "",
          shoppingFrequency: "",
          preferredBrand: "",
          profession: "",
        },
  });

  const currentQuestion = questions[currentStep];
  const watchedValues = form.watch();

  const canProceed = () => {
    const currentValue = watchedValues[currentQuestion.id as keyof SurveyData];
    return (
      currentQuestion.optional || (currentValue && currentValue.trim() !== "")
    );
  };

  const handleNext = async () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final submission
      setIsSubmitting(true);
      try {
        const formData = form.getValues();
        const result = await submitSurvey(formData);

        if (result.success && result.data) {
          console.log("Survey completed and saved:", formData);
          if (onComplete) {
            onComplete(result.data);
          } else {
            setIsComplete(true);
          }
        } else {
          console.error("Failed to submit survey:", result.error);
          // You might want to show an error toast to the user here
        }
      } catch (error) {
        console.error("Failed to submit survey:", error);
        // You might want to show an error message to the user here
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSkip = () => {
    if (currentQuestion.optional) {
      handleNext();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto p-8 text-center"
      >
        <div className="relative bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/30 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="relative"
          >
            <div className="relative">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
              <Sparkles className="w-4 h-4 text-blue-400 absolute -bottom-1 -left-1 animate-pulse delay-300" />
            </div>
          </motion.div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
            Dziękujemy! 🎉
          </h2>
          <p className="text-slate-600">
            Twoje odpowiedzi zostały pomyślnie zapisane.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl pointer-events-none" />

        {/* Progress Bar */}
        <div className="mb-8 relative">
          <div className="flex justify-between text-sm text-slate-500 mb-3">
            <span className="font-medium">
              Pytanie {currentStep + 1} z {questions.length}
            </span>
            <span className="font-medium">
              {Math.round(((currentStep + 1) / questions.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-200/50 rounded-full h-3 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-3 rounded-full shadow-sm"
              initial={{ width: 0 }}
              animate={{
                width: `${((currentStep + 1) / questions.length) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        <Form {...form}>
          <form className="space-y-6 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
                    {currentQuestion.title}
                    {currentQuestion.optional && (
                      <span className="text-sm font-normal text-slate-500 ml-2">
                        (Opcjonalne)
                      </span>
                    )}
                  </h2>
                  <p className="text-slate-600 leading-relaxed">
                    {currentQuestion.subtitle}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name={currentQuestion.id as keyof SurveyData}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        {(() => {
                          if (currentQuestion.type === "input") {
                            return (
                              <Input
                                placeholder={`Wpisz ${
                                  currentQuestion.id === "age"
                                    ? "swój wiek"
                                    : currentQuestion.id === "profession"
                                    ? "swój zawód"
                                    : "preferowaną markę"
                                }`}
                                {...field}
                                className="text-lg p-4 h-14 bg-white/50 border-slate-200/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
                              />
                            );
                          }

                          if (currentQuestion.type === "select") {
                            return (
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <SelectTrigger className="text-lg p-4 h-14 bg-white/50 border-slate-200/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                                  <SelectValue placeholder="Wybierz opcję" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200/50">
                                  {currentQuestion.options?.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                      className="rounded-lg"
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          }

                          if (currentQuestion.type === "radio") {
                            return (
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="space-y-3"
                              >
                                {currentQuestion.options?.map((option) => (
                                  <div
                                    key={option.value}
                                    className="flex items-center space-x-4 p-4 rounded-xl border border-slate-200/50 bg-white/30 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 hover:border-blue-200/50 transition-all duration-200 cursor-pointer group"
                                  >
                                    <RadioGroupItem
                                      value={option.value}
                                      id={option.value}
                                      className="border-slate-300 text-blue-600"
                                    />
                                    <Label
                                      htmlFor={option.value}
                                      className="flex-1 cursor-pointer text-slate-700 group-hover:text-slate-800 transition-colors"
                                    >
                                      {option.label}
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            );
                          }

                          return null;
                        })()}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 bg-white/50 border-slate-200/50 hover:bg-slate-50 rounded-xl px-6 py-3 transition-all duration-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Poprzedni
                </Button>

                {isEditMode && onCancel && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 rounded-xl px-6 py-3"
                  >
                    Anuluj
                  </Button>
                )}
              </div>

              <div className="flex gap-3">
                {currentQuestion.optional && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 rounded-xl px-6 py-3"
                  >
                    Pomiń
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed() || isSubmitting}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  {isSubmitting
                    ? isEditMode
                      ? "Aktualizowanie..."
                      : "Wysyłanie..."
                    : currentStep === questions.length - 1
                    ? isEditMode
                      ? "Aktualizuj"
                      : "Zakończ"
                    : "Dalej"}
                  {!isSubmitting && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
