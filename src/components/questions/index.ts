// Optimized lazy loading for question components to improve bundle size
import { lazy } from "react"

// Lazy load heavy interactive components
export const ImageSortQuestion = lazy(() => 
  import("./image-sort-question").then(module => ({ default: module.ImageSortQuestion }))
)

export const ImageSelectQuestion = lazy(() => 
  import("./image-select-question").then(module => ({ default: module.ImageSelectQuestion }))
)

export const VideoUploadQuestion = lazy(() => 
  import("./video-upload-question").then(module => ({ default: module.VideoUploadQuestion }))
)

export const RangeSliderQuestion = lazy(() => 
  import("./range-slider-question").then(module => ({ default: module.RangeSliderQuestion }))
)