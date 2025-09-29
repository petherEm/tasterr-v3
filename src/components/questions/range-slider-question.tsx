"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { RangeSliderQuestionProps } from "@/lib/types";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function RangeSliderQuestion({
  question,
  value,
  onChange,
}: RangeSliderQuestionProps) {
  const options = question.options as any;

  const min = options?.min ?? 0;
  const max = options?.max ?? 10;
  const step = options?.step ?? 1;
  const defaultValue = options?.defaultValue ?? Math.floor((min + max) / 2);
  const showValue = options?.showValue ?? true;
  const labels = options?.labels || { min: "Min", max: "Maks" };

  // Initialize value if not set and ensure it's a number
  const currentValue =
    value !== undefined ? Number(value) || defaultValue : defaultValue;
  const [isDragging, setIsDragging] = useState(false);

  const handleValueChange = (newValue: number[]) => {
    onChange(newValue[0]);
  };

  const handlePointerDown = () => {
    setIsDragging(true);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const getValuePercentage = () => {
    return ((currentValue - min) / (max - min)) * 100;
  };

  const getTickPositions = () => {
    const range = max - min;
    const tickCount = Math.min(11, range + 1); // Max 11 ticks (including start and end)
    const tickStep = range / (tickCount - 1);

    return Array.from({ length: tickCount }, (_, i) => {
      const tickValue = min + tickStep * i;
      const position = (tickValue / range) * 100;
      return { value: Math.round(tickValue * 100) / 100, position };
    });
  };

  const formatValue = (val: any) => {
    const numVal = Number(val);
    if (isNaN(numVal)) return "0";
    return Number.isInteger(numVal) ? numVal.toString() : numVal.toFixed(1);
  };

  return (
    <div className="space-y-8">
      {options?.instruction && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-800 font-medium">
            {options.instruction}
          </p>
        </div>
      )}

      <div className="space-y-8">
        {/* Enhanced Value Display */}
        {showValue && (
          <div className="text-center">
            <motion.div
              className={cn(
                "inline-flex items-center justify-center w-20 h-20 rounded-full border-4 transition-all duration-300 shadow-lg",
                isDragging
                  ? "border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 shadow-blue-200/50"
                  : "border-blue-300 bg-gradient-to-br from-white to-blue-50 text-blue-600 shadow-blue-100/30"
              )}
              animate={{
                scale: isDragging ? 1.15 : 1,
                borderColor: isDragging ? "#60a5fa" : "#93c5fd",
              }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
            >
              <span className="text-2xl font-bold">
                {formatValue(currentValue)}
              </span>
            </motion.div>
          </div>
        )}

        {/* Enhanced Slider */}
        <div className="relative px-6">
          <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200">
            <Slider
              value={[currentValue]}
              onValueChange={handleValueChange}
              min={min}
              max={max}
              step={step}
              className="w-full"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
            />

            {/* Enhanced Tick marks */}
            {max - min <= 20 && (
              <div className="absolute top-12 left-6 right-6">
                <div className="relative">
                  {getTickPositions().map((tick, index) => (
                    <div
                      key={index}
                      className="absolute transform -translate-x-1/2"
                      style={{ left: `${tick.position}%` }}
                    >
                      <div className="w-0.5 h-3 bg-gradient-to-b from-blue-300 to-blue-400 mx-auto rounded-full"></div>
                      <div className="text-xs text-blue-600 mt-2 min-w-max font-medium">
                        {formatValue(tick.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Labels */}
        <div className="flex justify-between items-center px-4">
          <div className="text-sm text-gray-700 text-left max-w-[40%] p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
            <div className="font-semibold text-blue-800">{labels.min}</div>
            <div className="text-blue-600 text-xs">({min})</div>
          </div>

          <div className="text-sm text-gray-700 text-right max-w-[40%] p-3 bg-gradient-to-l from-gray-50 to-blue-50 rounded-xl border border-gray-200">
            <div className="font-semibold text-blue-800">{labels.max}</div>
            <div className="text-blue-600 text-xs">({max})</div>
          </div>
        </div>

        {/* Enhanced Progress visualization */}
        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="inline-flex items-center space-x-3 text-sm text-blue-700">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>
              <span className="font-medium">
                {Math.round(getValuePercentage())}% wybrano
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Interactive feedback */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isDragging ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <p className="text-sm font-medium">Przeciągnij, aby dostosować swoją ocenę</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
