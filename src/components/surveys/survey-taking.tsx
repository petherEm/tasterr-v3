"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { motion, AnimatePresence } from "framer-motion"
import { CustomSurveyWithQuestions, QuestionType } from "@/lib/types"
import { ImageSortQuestion } from "@/components/questions/image-sort-question"
import { ImageSelectQuestion } from "@/components/questions/image-select-question"
import { UserImageUploadQuestion } from "@/components/questions/user-image-upload-question"
import { VideoUploadQuestion } from "@/components/questions/video-upload-question"
import { RangeSliderQuestion } from "@/components/questions/range-slider-question"
import { submitSurveyResponse } from "@/app/actions/surveys"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronRight, ChevronLeft, CheckCircle, Expand, X } from "lucide-react"

interface SurveyTakingProps {
  survey: CustomSurveyWithQuestions
}

export function SurveyTaking({ survey }: SurveyTakingProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null)

  const form = useForm({
    defaultValues: survey.questions.reduce((acc, question, index) => {
      // Initialize different default values based on question type
      switch (question.question_type) {
        case 'image_sort':
        case 'image_select':
          acc[`question_${index}`] = []
          break
        case 'image_comment':
          let imageCommentOptions: any
          try {
            imageCommentOptions = typeof question.options === 'string' ?
              JSON.parse(question.options) : question.options
          } catch (error) {
            imageCommentOptions = {}
          }
          acc[`question_${index}`] = imageCommentOptions?.images ?
            imageCommentOptions.images.reduce((comments: any, img: any) => {
              comments[img.id] = ""
              return comments
            }, {}) : {}
          break
        case 'image_upload_comment':
          acc[`question_${index}`] = []
          break
        case 'video_upload':
          acc[`question_${index}`] = null
          break
        case 'video_question':
          let videoQuestionOptions: any
          try {
            videoQuestionOptions = typeof question.options === 'string' ?
              JSON.parse(question.options) : question.options
          } catch (error) {
            videoQuestionOptions = {}
          }
          if (videoQuestionOptions?.responseType === 'both') {
            acc[`question_${index}`] = { text: "", video: null }
          } else if (videoQuestionOptions?.responseType === 'video') {
            acc[`question_${index}`] = null
          } else {
            acc[`question_${index}`] = ""
          }
          break
        case 'range':
          const rangeOptions = question.options as any
          acc[`question_${index}`] = rangeOptions?.defaultValue || 5
          break
        default:
          acc[`question_${index}`] = ""
      }
      return acc
    }, {} as Record<string, any>)
  })

  const currentQuestion = survey.questions[currentStep]
  const watchedValues = form.watch()

  const canProceed = () => {
    const currentValue = watchedValues[`question_${currentStep}`]
    
    if (!currentQuestion.is_required) {
      return true
    }
    
    // Different validation based on question type
    switch (currentQuestion.question_type) {
      case 'image_sort':
      case 'image_select':
        return Array.isArray(currentValue) && currentValue.length > 0
      case 'image_comment':
        if (typeof currentValue === 'object' && currentValue !== null) {
          const comments = Object.values(currentValue)
          return comments.every((comment: any) => typeof comment === 'string' && comment.trim() !== "")
        }
        return false
      case 'image_upload_comment':
        let uploadOptions: any
        try {
          uploadOptions = typeof currentQuestion.options === 'string' ?
            JSON.parse(currentQuestion.options) : currentQuestion.options
        } catch (error) {
          uploadOptions = {}
        }
        if (!Array.isArray(currentValue)) return false

        // Check minimum images requirement
        const minImages = uploadOptions?.minImages || 1
        if (currentValue.length < minImages) return false

        // If comments are required, check that all images have comments
        if (uploadOptions?.requireCommentForEach) {
          return currentValue.every((img: any) =>
            img.comment && typeof img.comment === 'string' && img.comment.trim() !== ""
          )
        }

        return true
      case 'video_upload':
        return currentValue !== null && currentValue !== undefined
      case 'video_question':
        const videoOptions = currentQuestion.options as any
        if (videoOptions?.responseType === 'both') {
          return currentValue?.text?.trim() !== "" || currentValue?.video !== null
        } else if (videoOptions?.responseType === 'video') {
          return currentValue !== null && currentValue !== undefined
        } else {
          return currentValue && typeof currentValue === 'string' && currentValue.trim() !== ""
        }
      case 'range':
        return typeof currentValue === 'number'
      default:
        return currentValue && typeof currentValue === 'string' && currentValue.trim() !== ""
    }
  }

  const handleNext = async () => {
    if (currentStep < survey.questions.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Final submission
      setIsSubmitting(true)
      try {
        const formData = form.getValues()
        
        // Transform form data to match question structure
        const responses = survey.questions.reduce((acc, question, index) => {
          const questionKey = `question_${question.id}`
          const formKey = `question_${index}`
          acc[questionKey] = formData[formKey]
          return acc
        }, {} as Record<string, any>)

        const result = await submitSurveyResponse(survey.id!, responses)

        if (result.success) {
          setIsComplete(true)
        } else {
          console.error("Failed to submit survey:", result.error)
          // TODO: Show error toast/message to user
        }
      } catch (error) {
        console.error("Failed to submit survey:", error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleSkip = () => {
    if (!currentQuestion.is_required) {
      form.setValue(`question_${currentStep}`, "")
      handleNext()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dziękujemy! 🎉</h2>
        <p className="text-gray-600 mb-6">
          Twoje odpowiedzi zostały pomyślnie zapisane.
        </p>
        <Button onClick={() => router.push("/surveys")}>
          Zobacz Więcej Ankiet
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Survey Header */}
      <Card className="mb-6">
        {/* Survey Cover Image */}
        {survey.intro_image_url ? (
          <div className="relative h-64 w-full overflow-hidden rounded-t-lg">
            <img
              src={survey.intro_image_url}
              alt={survey.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-3xl font-bold text-white mb-2">{survey.title}</h1>
              {survey.description && (
                <p className="text-white/90">{survey.description}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="relative h-32 w-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg">
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-3xl font-bold text-white mb-2">{survey.title}</h1>
              {survey.description && (
                <p className="text-white/90">{survey.description}</p>
              )}
            </div>
          </div>
        )}

        <CardContent className="pt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-gray-700">{survey.introduction}</p>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>
            Pytanie {currentStep + 1} z {survey.questions.length}
          </span>
          <span>
            {Math.round(((currentStep + 1) / survey.questions.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${((currentStep + 1) / survey.questions.length) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {currentQuestion.question_text}
                      {currentQuestion.is_required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </h2>
                    {currentQuestion.question_subtitle && (
                      <p className="text-gray-600">{currentQuestion.question_subtitle}</p>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name={`question_${currentStep}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          {(() => {
                            switch (currentQuestion.question_type) {
                              case "input":
                                return (
                                  <Input
                                    placeholder="Wprowadź swoją odpowiedź"
                                    {...field}
                                    className="text-lg p-4 h-12"
                                  />
                                )
                              
                              case "textarea":
                                return (
                                  <Textarea
                                    placeholder="Wprowadź swoją szczegółową odpowiedź"
                                    {...field}
                                    rows={4}
                                    className="text-lg p-4"
                                  />
                                )
                              
                              case "number":
                                return (
                                  <Input
                                    type="number"
                                    placeholder="Wprowadź liczbę"
                                    {...field}
                                    className="text-lg p-4 h-12"
                                  />
                                )

                              case "select":
                                const selectOptions = currentQuestion.options as any[]
                                return (
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <SelectTrigger className="text-lg p-4 h-12">
                                      <SelectValue placeholder="Wybierz opcję" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {selectOptions?.map((option: any, index: number) => (
                                        <SelectItem key={`${option.value}-${index}`} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )

                              case "radio":
                                const radioOptions = currentQuestion.options as any[]
                                return (
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="space-y-3"
                                  >
                                    {radioOptions?.map((option: any, index: number) => (
                                      <div
                                        key={`${option.value}-${index}`}
                                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
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
                                )

                              case "image_sort":
                                return (
                                  <ImageSortQuestion
                                    question={currentQuestion}
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                )

                              case "image_select":
                                return (
                                  <ImageSelectQuestion
                                    question={currentQuestion}
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                )

                              case "image_comment":
                                let imageCommentRenderOptions: any
                                try {
                                  imageCommentRenderOptions = typeof currentQuestion.options === 'string' ?
                                    JSON.parse(currentQuestion.options) : currentQuestion.options
                                } catch (error) {
                                  imageCommentRenderOptions = {}
                                }
                                return (
                                  <div className="space-y-6">
                                    {/* Render images with comment boxes */}
                                    <div className="text-sm text-gray-600 mb-4">
                                      {imageCommentRenderOptions?.instruction || "Proszę podzielić się swoimi przemyśleniami na temat każdego zdjęcia"}
                                    </div>
                                    {imageCommentRenderOptions?.images?.map((image: any) => (
                                      <div key={image.id} className="border rounded-lg p-4 space-y-3">
                                        <div
                                          className="relative group cursor-pointer"
                                          onClick={() => {
                                            console.log("Image clicked:", image.url)
                                            setSelectedImage({ url: image.url, alt: image.alt })
                                          }}
                                        >
                                          <img
                                            src={image.url}
                                            alt={image.alt}
                                            className="w-full max-w-md h-48 object-cover rounded-lg mx-auto transition-transform hover:scale-[1.02]"
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center pointer-events-none">
                                            <Expand className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium">
                                            {image.textPrompt || "Co myślisz o tym zdjęciu?"}
                                          </Label>
                                          <Textarea
                                            placeholder="Podziel się swoimi przemyśleniami..."
                                            value={field.value?.[image.id] || ""}
                                            onChange={(e) => {
                                              const newValue = { ...field.value }
                                              newValue[image.id] = e.target.value
                                              field.onChange(newValue)
                                            }}
                                            className="mt-2"
                                            rows={3}
                                            maxLength={imageCommentRenderOptions?.maxTextLength || 200}
                                          />
                                          <div className="text-xs text-gray-500 mt-1 text-right">
                                            {(field.value?.[image.id] || "").length} / {imageCommentRenderOptions?.maxTextLength || 200}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )

                              case "image_upload_comment":
                                return (
                                  <UserImageUploadQuestion
                                    question={currentQuestion}
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                )

                              case "video_question":
                                const videoOptions = currentQuestion.options as any
                                return (
                                  <div className="space-y-6">
                                    {videoOptions?.video && (
                                      <div className="space-y-4">
                                        <video
                                          src={videoOptions.video.url}
                                          controls
                                          className="w-full max-w-2xl rounded-lg mx-auto"
                                        >
                                          Twoja przeglądarka nie obsługuje tagu wideo.
                                        </video>
                                      </div>
                                    )}

                                    <div className="text-sm text-gray-600 mb-4">
                                      {videoOptions?.instruction || "Obejrzyj wideo i podaj swoją odpowiedź"}
                                    </div>

                                    {videoOptions?.responseType === 'text' || videoOptions?.responseType === 'both' ? (
                                      <div>
                                        <Label className="text-sm font-medium">Twoja Odpowiedź</Label>
                                        <Textarea
                                          placeholder="Podziel się swoimi przemyśleniami o wideo..."
                                          value={videoOptions?.responseType === 'both' ? field.value?.text || "" : field.value || ""}
                                          onChange={(e) => {
                                            if (videoOptions?.responseType === 'both') {
                                              field.onChange({ ...field.value, text: e.target.value })
                                            } else {
                                              field.onChange(e.target.value)
                                            }
                                          }}
                                          className="mt-2"
                                          rows={4}
                                          maxLength={videoOptions?.maxTextLength || 500}
                                        />
                                        <div className="text-xs text-gray-500 mt-1 text-right">
                                          {(videoOptions?.responseType === 'both' ?
                                            (field.value?.text || "").length :
                                            (field.value || "").length
                                          )} / {videoOptions?.maxTextLength || 500}
                                        </div>
                                      </div>
                                    ) : null}

                                    {videoOptions?.responseType === 'video' && (
                                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                        <p className="text-gray-500">Przesyłanie odpowiedzi wideo już wkrótce...</p>
                                      </div>
                                    )}
                                  </div>
                                )

                              case "video_upload":
                                return (
                                  <VideoUploadQuestion
                                    question={currentQuestion}
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                )

                              case "range":
                                return (
                                  <RangeSliderQuestion
                                    question={currentQuestion}
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                )

                              default:
                                return (
                                  <Input
                                    placeholder="Wprowadź swoją odpowiedź"
                                    {...field}
                                    className="text-lg p-4 h-12"
                                  />
                                )
                            }
                          })()}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2 bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
              Poprzedni
            </Button>

            <div className="flex gap-3">
              {!currentQuestion.is_required && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-gray-500"
                >
                  Pomiń
                </Button>
              )}

              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {isSubmitting
                  ? "Wysyłanie..."
                  : currentStep === survey.questions.length - 1
                  ? "Zakończ Ankietę"
                  : "Dalej"}
                {!isSubmitting && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* Image Enlargement Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] p-0 gap-0" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Podgląd Zdjęcia</DialogTitle>
          </DialogHeader>
          {selectedImage ? (
            <div className="relative w-full h-[90vh] flex items-center justify-center bg-black/5">
              <img
                src={selectedImage.url}
                alt={selectedImage.alt}
                className="max-w-full max-h-full object-contain"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4 bg-white/95 hover:bg-white shadow-lg z-10"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div>Nie wybrano zdjęcia</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}