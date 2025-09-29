"use client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import type { ImageSortQuestionProps, ImageOption } from "@/lib/types";
import { GripVertical } from "lucide-react";

export function ImageSortQuestion({
  question,
  value = [],
  onChange,
}: ImageSortQuestionProps) {
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

  console.log("ImageSortQuestion data:", {
    question,
    originalOptions: question.options,
    parsedOptions: options,
    images,
    imagesLength: images.length,
  });

  // Initialize value with all image IDs if empty
  const sortedImageIds =
    value.length > 0 ? value : images.map((img: ImageOption) => img.id);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = sortedImageIds.indexOf(active.id as string);
      const newIndex = sortedImageIds.indexOf(over?.id as string);

      const newOrder = arrayMove(sortedImageIds, oldIndex, newIndex);
      onChange(newOrder);
    }
  };

  const getSortedImages = () => {
    return sortedImageIds
      .map((id: string) => images.find((img: ImageOption) => img.id === id))
      .filter(Boolean);
  };

  return (
    <div className="space-y-6">
      {options?.instruction && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-800 font-medium">
            {options.instruction}
          </p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedImageIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {getSortedImages().map((image: ImageOption, index: number) => (
              <SortableImageItem key={image.id} image={image} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
        <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
          <GripVertical className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm text-blue-800 font-medium">
          Przeciągnij elementy, aby uporządkować według preferencji (1 = najbardziej preferowane)
        </p>
      </div>
    </div>
  );
}

interface SortableImageItemProps {
  image: ImageOption;
  index: number;
}

function SortableImageItem({ image, index }: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300
        ${
          isDragging
            ? "shadow-2xl shadow-blue-200/50 opacity-90 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 scale-105"
            : "hover:shadow-lg bg-gradient-to-r from-white to-gray-50 border-gray-200 hover:border-blue-300"
        }
        cursor-grab active:cursor-grabbing
      `}
      whileHover={{ scale: isDragging ? 1.05 : 1.02, y: isDragging ? 0 : -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      {/* Enhanced Ranking Badge */}
      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
        {index + 1}
      </div>

      {/* Enhanced Image */}
      <div className="flex-shrink-0">
        <div className="relative">
          <img
            src={image.url || "/placeholder.svg"}
            alt={image.alt}
            className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-md"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
        </div>
      </div>

      {/* Enhanced Image Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 truncate text-base">
          {image.title || `Zdjęcie ${index + 1}`}
        </h4>
        <p className="text-sm text-blue-600 truncate font-medium">
          {image.alt}
        </p>
      </div>

      {/* Enhanced Drag Handle */}
      <div
        {...listeners}
        className="flex-shrink-0 p-3 text-gray-400 hover:text-blue-600 transition-colors touch-none rounded-lg hover:bg-blue-50"
      >
        <GripVertical className="w-5 h-5" />
      </div>
    </motion.div>
  );
}
