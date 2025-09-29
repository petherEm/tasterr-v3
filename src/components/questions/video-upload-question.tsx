"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import type {
  VideoUploadQuestionProps,
  VideoUploadResponse,
} from "@/lib/types";
import {
  uploadFile,
  validateFile,
  generateFilePath,
} from "@/lib/supabase-storage";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase-client-auth";
import { useUser, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  Camera,
  Check,
  AlertCircle,
  FileVideo,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function VideoUploadQuestion({
  question,
  value,
  onChange,
}: VideoUploadQuestionProps) {
  const options = question.options as any;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { user } = useUser();
  const { getToken } = useAuth();

  const maxSizeBytes = options?.maxSizeBytes || 52428800; // 50MB default
  const maxDurationSeconds = options?.maxDurationSeconds || 60;
  const acceptedFormats = options?.acceptedFormats || ["mp4"];
  const allowRecording = options?.allowRecording || false;

  const handleFileUpload = async (file: File) => {
    if (!user?.id) {
      setError("Użytkownik nie jest uwierzytelniony");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Validate file
      const validation = await validateFile(file, {
        maxSizeBytes,
        allowedTypes: acceptedFormats,
        maxDurationSeconds,
      });

      if (!validation.valid) {
        setError(validation.error || "Walidacja pliku nie powiodła się");
        setIsUploading(false);
        return;
      }

      // Generate unique file path
      const filePath = generateFilePath(
        user.id,
        question.survey_id || "unknown",
        file.name,
        "video"
      );

      // Simulate upload progress (since Supabase doesn't provide progress callbacks)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Create authenticated Supabase client and upload
      const supabaseClient = await createAuthenticatedSupabaseClient(getToken);
      const uploadResult = await uploadFile(
        supabaseClient,
        file,
        "survey-videos",
        filePath
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadResult.success) {
        const videoResponse: VideoUploadResponse = {
          fileName: uploadResult.data.fileName,
          filePath: uploadResult.data.publicUrl,
          fileSize: uploadResult.data.fileSize,
          duration: validation.duration,
          uploadedAt: new Date().toISOString(),
          uploadKey: uploadResult.data.path,
        };

        onChange(videoResponse);
        setUploadProgress(0);
        setIsUploading(false);
      } else {
        throw new Error(uploadResult.error);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setError(error instanceof Error ? error.message : "Przesyłanie nie powiodło się");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      await handleFileUpload(file);
    },
    [
      user,
      getToken,
      maxSizeBytes,
      maxDurationSeconds,
      acceptedFormats,
      question.survey_id,
      onChange,
    ]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": acceptedFormats.map((format) => `.${format}`),
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleRemove = () => {
    onChange(null);
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // If video is uploaded, show enhanced preview
  if (value) {
    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {options?.instruction && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-800 font-medium">
              {options.instruction}
            </p>
          </div>
        )}

        <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl">
          <video
            src={value.filePath}
            className="w-full max-h-80 object-contain"
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Enhanced Remove Button */}
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Enhanced File Info */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-lg">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-800">{value.fileName}</p>
              <p className="text-sm text-green-600 flex items-center gap-2">
                <span>{formatFileSize(value.fileSize)}</span>
                {value.duration && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(value.duration)}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {options?.instruction && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-800 font-medium">
            {options.instruction}
          </p>
        </div>
      )}

      {/* Enhanced Upload Area */}
      <motion.div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer",
          isDragActive
            ? "border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-lg shadow-blue-200/50"
            : "border-gray-300 hover:border-blue-400 bg-gradient-to-br from-gray-50 to-blue-50 hover:shadow-md",
          isUploading && "pointer-events-none opacity-70"
        )}
        whileHover={{ scale: isUploading ? 1 : 1.01, y: isUploading ? 0 : -2 }}
        whileTap={{ scale: isUploading ? 1 : 0.99 }}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <Upload className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900 mb-4">
                  Przesyłanie Twojego wideo...
                </p>
                <Progress
                  value={uploadProgress}
                  className="mt-2 max-w-xs mx-auto h-3"
                />
                <p className="text-sm text-blue-600 mt-2 font-medium">
                  {uploadProgress}% ukończone
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <FileVideo className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">
                  {isDragActive ? "Upuść swoje wideo tutaj" : "Prześlij wideo"}
                </p>
                <p className="text-sm text-blue-600 mt-2 font-medium">
                  Przeciągnij i upuść lub kliknij, aby przeglądać
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Enhanced Upload Options & Constraints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* File Constraints */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Wymagania
          </h4>
          <ul className="text-sm text-blue-700 space-y-2">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              Maks. rozmiar: {Math.round(maxSizeBytes / 1024 / 1024)}MB
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              Maks. długość: {maxDurationSeconds}s
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              Format: {acceptedFormats.join(", ").toUpperCase()}
            </li>
          </ul>
        </div>

        {/* Recording Option */}
        {allowRecording && (
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
            <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Nagraj Bezpośrednio
            </h4>
            <p className="text-sm text-indigo-700 mb-3">
              Użyj kamery swojego urządzenia do nagrywania
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-indigo-700 border-indigo-300 hover:bg-indigo-50 bg-white"
            >
              <Camera className="w-4 h-4 mr-2" />
              Rozpocznij Nagrywanie
            </Button>
          </div>
        )}
      </div>

      {/* Enhanced Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm"
          >
            <div className="p-1 bg-red-200 rounded-full">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-800">Błąd Przesyłania</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
