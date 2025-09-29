"use client";

import type React from "react";

import { useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import type { SurveyQuestion, ImageUploadCommentOptions } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  X,
  Upload,
  ImageIcon,
  Expand,
  Camera,
  Plus,
  CheckCircle2,
} from "lucide-react";
import {
  uploadFile,
  generateFilePath,
  compressImage,
} from "@/lib/supabase-storage";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase-client-auth";
import { motion, AnimatePresence } from "framer-motion";

interface UserImageUploadQuestionProps {
  question: SurveyQuestion;
  value: Array<{
    id: string;
    url: string;
    fileName: string;
    comment: string;
    uploadKey: string;
  }>;
  onChange: (
    value: Array<{
      id: string;
      url: string;
      fileName: string;
      comment: string;
      uploadKey: string;
    }>
  ) => void;
}

export function UserImageUploadQuestion({
  question,
  value = [],
  onChange,
}: UserImageUploadQuestionProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    alt: string;
    comment: string;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { user } = useUser();
  const { getToken } = useAuth();

  // Ensure value is always an array
  const currentValue = Array.isArray(value) ? value : [];

  // Parse options - handle both object and JSON string formats
  let parsedOptions: ImageUploadCommentOptions;

  // Debug: log the raw options to see what's coming from the database
  console.log(
    "Raw question.options:",
    question.options,
    "Type:",
    typeof question.options
  );

  try {
    if (typeof question.options === "string") {
      parsedOptions = JSON.parse(question.options);
    } else {
      parsedOptions = question.options as ImageUploadCommentOptions;
    }
    console.log("Successfully parsed options:", parsedOptions);
  } catch (error) {
    console.error("Error parsing question options:", error);
    parsedOptions = {
      maxImages: 1,
      minImages: 1,
      instruction: "Prześlij zdjęcia i podziel się swoimi przemyśleniami na temat każdego z nich",
      imagePrompt: "Opowiedz nam o tym zdjęciu",
      maxTextLength: 300,
      requireCommentForEach: true,
      allowedFormats: ["jpg", "jpeg", "png", "webp"],
      maxFileSize: 4194304, // 4MB
    };
  }

  const options = parsedOptions || {
    maxImages: 1,
    minImages: 1,
    instruction: "Upload images and provide your thoughts on each one",
    imagePrompt: "Tell us about this image",
    maxTextLength: 300,
    requireCommentForEach: true,
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxFileSize: 4194304, // 4MB
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      handleMultipleFiles(files);
    }
  };

  const handleMultipleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Check if adding these files would exceed max images
    if (currentValue.length + files.length > options.maxImages) {
      setUploadError(
        `Maksymalnie ${options.maxImages} zdjęć dozwolone. Aktualnie masz ${currentValue.length}.`
      );
      return;
    }

    if (!user?.id) {
      setUploadError("Musisz być zalogowany, aby przesłać zdjęcia");
      return;
    }

    setUploading(true);
    setUploadError("");

    const uploadPromises = files.map(async (file, index) => {
      try {
        // Validate file size
        if (file.size > (options.maxFileSize || 4194304)) {
          throw new Error(
            `Plik "${file.name}" jest za duży. Maksymalnie ${Math.round(
              (options.maxFileSize || 4194304) / 1024 / 1024
            )}MB dozwolone.`
          );
        }

        // Validate file type
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        const allowedFormats = options.allowedFormats || [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ];
        if (!allowedFormats.includes(fileExtension || "")) {
          throw new Error(
            `Format pliku "${
              file.name
            }" nie jest dozwolony. Dozwolone formaty: ${allowedFormats.join(
              ", "
            )}`
          );
        }

        // Compress image for better performance
        const compressedFile = await compressImage(file, 1200, 0.85);

        // Generate unique file path
        const filePath = generateFilePath(
          user.id,
          "user-response",
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

        if (uploadResult.success) {
          return {
            id: uploadResult.data.path,
            url: uploadResult.data.publicUrl,
            fileName: uploadResult.data.fileName,
            comment: "",
            uploadKey: uploadResult.data.path,
          };
        } else {
          throw new Error(`Upload failed: ${uploadResult.error}`);
        }
      } catch (error) {
        console.error("Error uploading file:", file.name, error);
        throw error;
      }
    });

    try {
      const uploadedImages = await Promise.all(uploadPromises);
      onChange([...currentValue, ...uploadedImages]);
    } catch (error) {
      setUploadError(
        `Przesyłanie nie powiodło się: ${
          error instanceof Error ? error.message : "Nieznany błąd"
        }`
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    await handleMultipleFiles(files);
    // Clear the input
    event.target.value = "";
  };

  const updateComment = (imageId: string, comment: string) => {
    const updatedImages = currentValue.map((img) =>
      img.id === imageId ? { ...img, comment } : img
    );
    onChange(updatedImages);
  };

  const removeImage = (imageId: string) => {
    const updatedImages = currentValue.filter((img) => img.id !== imageId);
    onChange(updatedImages);
  };

  const canUploadMore = currentValue.length < options.maxImages;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-5 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-indigo-800 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Prześlij{" "}
            {options.minImages === options.maxImages
              ? options.maxImages
              : `${options.minImages}-${options.maxImages}`}{" "}
            zdjęć
          </span>
          <span className="text-sm text-indigo-600 bg-indigo-100 px-4 py-2 rounded-full font-medium">
            {currentValue.length} / {options.maxImages}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 bg-indigo-100 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${(currentValue.length / options.maxImages) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
          />
        </div>
      </motion.div>

      {canUploadMore && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`relative bg-white rounded-2xl border-3 border-dashed transition-all duration-300 ${
            dragActive
              ? "border-indigo-400 bg-indigo-50 scale-105"
              : uploading
              ? "border-gray-300 bg-gray-50"
              : "border-indigo-300 hover:border-indigo-400 hover:bg-indigo-50"
          } shadow-lg hover:shadow-xl`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={options.allowedFormats
              ?.map((format) => `.${format}`)
              .join(",")}
            onChange={handleFileUpload}
            className="hidden"
            id={`user-image-upload-${question.id}`}
            disabled={uploading}
            multiple
          />
          <label
            htmlFor={`user-image-upload-${question.id}`}
            className={`
              ${uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              p-8 flex flex-col items-center justify-center transition-all duration-300 block w-full
            `}
          >
            {uploading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="relative">
                  <Upload className="w-12 h-12 text-indigo-400" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                    className="absolute inset-0 border-2 border-indigo-400 border-t-transparent rounded-full"
                  />
                </div>
                <span className="text-base text-indigo-600 font-medium">
                  Przesyłanie Twoich zdjęć...
                </span>
                <div className="flex gap-1">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 0.6,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className="w-2 h-2 bg-indigo-400 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 0.6,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 0.2,
                    }}
                    className="w-2 h-2 bg-indigo-400 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 0.6,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 0.4,
                    }}
                    className="w-2 h-2 bg-indigo-400 rounded-full"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <ImageIcon className="w-8 h-8 text-white" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </motion.div>
                </div>

                <div className="text-center">
                  <span className="text-lg font-semibold text-gray-700 block">
                    {dragActive
                      ? "Upuść swoje zdjęcia tutaj!"
                      : `Prześlij ${
                          currentValue.length === 0 ? "swoje pierwsze" : "więcej"
                        } zdjęć`}
                  </span>
                  <p className="text-sm text-gray-500 mt-2">
                    Przeciągnij i upuść lub kliknij, aby przeglądać
                  </p>
                  <div className="text-xs text-gray-400 mt-2 bg-gray-100 px-3 py-1 rounded-full inline-block">
                    {options.allowedFormats?.join(", ").toUpperCase()} • Max{" "}
                    {Math.round((options.maxFileSize || 4194304) / 1024 / 1024)}
                    MB each
                  </div>
                </div>
              </motion.div>
            )}
          </label>
        </motion.div>
      )}

      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <X className="w-3 h-3 text-white" />
              </div>
              <p className="text-red-700 font-medium">{uploadError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentValue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Przesłane Zdjęcia ({currentValue.length})
            </h3>

            <div className="grid gap-4">
              {currentValue.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white border-2 border-gray-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex gap-5">
                    {/* Enhanced Image Preview */}
                    <div className="relative group shrink-0">
                      <motion.img
                        whileHover={{ scale: 1.05 }}
                        src={image.url}
                        alt={`Image ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-xl border-2 border-gray-200 cursor-pointer shadow-md group-hover:shadow-lg transition-all duration-300"
                        onClick={() =>
                          setSelectedImage({
                            url: image.url,
                            alt: `Uploaded image ${index + 1}`,
                            comment: image.comment,
                          })
                        }
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-xl flex items-center justify-center">
                        <Expand className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>

                      {/* Image number badge */}
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                        {index + 1}
                      </div>
                    </div>

                    {/* Enhanced Comment Area */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Camera className="w-4 h-4 text-indigo-500" />
                          Komentarz do Zdjęcia {index + 1}
                          {options.requireCommentForEach && (
                            <span className="text-red-500">*</span>
                          )}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeImage(image.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 rounded-full transition-all duration-200"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <Textarea
                        placeholder={`Opowiedz nam o tym zdjęciu...`}
                        value={image.comment}
                        onChange={(e) =>
                          updateComment(image.id, e.target.value)
                        }
                        rows={3}
                        maxLength={options.maxTextLength || 300}
                        className={`resize-none text-sm border-2 rounded-xl transition-all duration-200 ${
                          options.requireCommentForEach && !image.comment.trim()
                            ? "border-red-300 focus:border-red-400 bg-red-50"
                            : "border-gray-300 focus:border-indigo-400 bg-white"
                        }`}
                      />

                      <div className="flex justify-between items-center text-xs">
                        <span
                          className={`flex items-center gap-2 ${
                            options.requireCommentForEach &&
                            !image.comment.trim()
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {options.requireCommentForEach &&
                          !image.comment.trim() ? (
                            <>
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                              Wymagane
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Ukończone
                            </>
                          )}
                        </span>
                        <span className="text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                          {image.comment.length}/{options.maxTextLength || 300}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentValue.length < options.minImages && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 shadow-lg"
          >
            <div className="text-base text-amber-800 flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                className="w-4 h-4 bg-amber-500 rounded-full"
              />
              <span className="font-medium">
                Potrzebujesz jeszcze {options.minImages - currentValue.length} zdjęć{" "}
                {options.minImages - currentValue.length > 1 ? "" : ""} aby
                kontynuować
                {options.requireCommentForEach && " (z komentarzami)"}
              </span>
            </div>
          </motion.div>
        )}

        {currentValue.length >= options.minImages &&
          options.requireCommentForEach &&
          !currentValue.every((img) => img.comment?.trim()) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 shadow-lg"
            >
              <div className="text-base text-amber-800 flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                  className="w-4 h-4 bg-amber-500 rounded-full"
                />
                <span className="font-medium">
                  Wszystkie zdjęcia potrzebują komentarzy, aby kontynuować
                </span>
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-[95vw] w-full p-0 bg-black/95 border-0 rounded-3xl overflow-hidden">
          <DialogHeader className="absolute top-8 left-8 z-10">
            <DialogTitle className="text-white text-2xl font-bold drop-shadow-2xl">
              Podgląd Zdjęcia
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative flex flex-col h-full">
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
                      <Camera className="w-6 h-6 text-indigo-500" />
                      Twój komentarz:
                    </p>
                    <p className="text-gray-900 leading-relaxed text-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100">
                      {selectedImage.comment}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
