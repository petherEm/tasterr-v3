"use client";

import { motion } from "framer-motion";
import type { ImageSelectQuestionProps, ImageOption } from "@/lib/types";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageSelectQuestion({
  question,
  value = [],
  onChange,
}: ImageSelectQuestionProps) {
  // Safely parse options - handle both object and string cases
  let options: any;
  try {
    options =
      typeof question.options === "string"
        ? JSON.parse(question.options)
        : question.options;
  } catch (error) {
    console.error("Failed to parse question options:", error);
    options = {};
  }

  const images = options?.images || [];
  const maxSelections = options?.maxSelections || 3;
  const minSelections = options?.minSelections || 1;

  console.log("ImageSelectQuestion data:", {
    question,
    originalOptions: question.options,
    parsedOptions: options,
    images,
    imagesLength: images.length,
  });

  const handleImageToggle = (imageId: string) => {
    const isSelected = value.includes(imageId);

    if (isSelected) {
      // Remove from selection
      onChange(value.filter((id) => id !== imageId));
    } else {
      // Add to selection if under limit
      if (value.length < maxSelections) {
        onChange([...value, imageId]);
      }
    }
  };

  const isMaxSelected = value.length >= maxSelections;
  const selectionText = `${value.length} z ${maxSelections} wybrano`;
  const isValid = value.length >= minSelections;

  return (
    <div className="space-y-6">
      {options?.instruction && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-800 font-medium">
            {options.instruction}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((image: ImageOption) => {
          const isSelected = value.includes(image.id);
          const canSelect = !isMaxSelected || isSelected;

          return (
            <motion.div
              key={image.id}
              className={cn(
                "relative aspect-square cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300",
                isSelected
                  ? "border-blue-500 ring-4 ring-blue-200/50 shadow-lg shadow-blue-200/50"
                  : canSelect
                  ? "border-gray-200 hover:border-blue-300 hover:shadow-md"
                  : "border-gray-100 opacity-60 cursor-not-allowed"
              )}
              onClick={() => canSelect && handleImageToggle(image.id)}
              whileHover={canSelect ? { scale: 1.02, y: -2 } : {}}
              whileTap={canSelect ? { scale: 0.98 } : {}}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Image */}
              <img
                src={image.url || "/placeholder.svg"}
                alt={image.alt}
                className="w-full h-full object-cover"
                draggable={false}
              />

              {/* Gradient Overlay */}
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-300",
                  isSelected
                    ? "bg-gradient-to-t from-blue-600/30 via-blue-400/20 to-transparent"
                    : "bg-gradient-to-t from-black/0 via-transparent to-transparent hover:from-blue-600/10"
                )}
              />

              {/* Selection Indicator */}
              <div className="absolute top-3 right-3">
                <motion.div
                  className={cn(
                    "w-7 h-7 rounded-full border-2 flex items-center justify-center backdrop-blur-sm",
                    isSelected
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 border-white text-white shadow-lg"
                      : "bg-white/90 border-gray-300 shadow-sm"
                  )}
                  initial={false}
                  animate={{
                    scale: isSelected ? 1.1 : 1,
                    rotate: isSelected ? 360 : 0,
                  }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                >
                  {isSelected && <Check className="w-4 h-4" />}
                </motion.div>
              </div>

              {/* Image Title */}
              {image.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                  <p className="text-white text-sm font-medium truncate">
                    {image.title}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Selection Counter */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
        <div
          className={cn(
            "text-sm font-semibold flex items-center gap-2",
            isValid ? "text-green-700" : "text-orange-700"
          )}
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isValid ? "bg-green-500" : "bg-orange-500"
            )}
          />
          {selectionText}
          {minSelections > 1 && value.length < minSelections && (
            <span className="text-orange-600 ml-2 text-xs bg-orange-100 px-2 py-1 rounded-full">
              Wybierz co najmniej {minSelections}
            </span>
          )}
        </div>

        {isMaxSelected && (
          <div className="text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
            Maksimum osiągnięte
          </div>
        )}
      </div>

      {/* Enhanced Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Postęp</span>
          <span>{Math.round((value.length / maxSelections) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <motion.div
            className={cn(
              "h-3 rounded-full transition-colors duration-300",
              isValid
                ? "bg-gradient-to-r from-green-500 to-emerald-600"
                : "bg-gradient-to-r from-blue-500 to-indigo-600"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${(value.length / maxSelections) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
