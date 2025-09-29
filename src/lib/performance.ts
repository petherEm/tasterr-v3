// Performance utilities and optimizations

// Image optimization helpers
export const getOptimizedImageUrl = (url: string, width?: number, height?: number) => {
  if (!url) return ''
  
  // For UploadThing URLs, add transformation parameters
  if (url.includes('uploadthing')) {
    const params = new URLSearchParams()
    if (width) params.set('w', width.toString())
    if (height) params.set('h', height.toString())
    params.set('f', 'webp') // Use WebP format for better compression
    
    return `${url}?${params.toString()}`
  }
  
  return url
}

// Debounce utility for form inputs
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Memory-efficient file validation
export const validateVideoFile = (file: File, maxSize: number, maxDuration: number): Promise<{
  valid: boolean
  error?: string
  duration?: number
}> => {
  return new Promise((resolve) => {
    // Check file size first (fastest check)
    if (file.size > maxSize) {
      resolve({
        valid: false,
        error: `File size too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`
      })
      return
    }

    // Check file type
    if (!file.type.includes('mp4')) {
      resolve({
        valid: false,
        error: 'Invalid file format. Please upload MP4 files only'
      })
      return
    }

    // Create video element to check duration
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    const cleanup = () => {
      URL.revokeObjectURL(video.src)
      video.remove()
    }

    video.onloadedmetadata = () => {
      const duration = video.duration
      
      if (duration > maxDuration) {
        cleanup()
        resolve({
          valid: false,
          error: `Video too long. Maximum duration is ${maxDuration} seconds`
        })
        return
      }
      
      cleanup()
      resolve({
        valid: true,
        duration
      })
    }
    
    video.onerror = () => {
      cleanup()
      resolve({
        valid: false,
        error: 'Invalid video file'
      })
    }
    
    // Set timeout to avoid hanging
    setTimeout(() => {
      cleanup()
      resolve({
        valid: false,
        error: 'Video validation timeout'
      })
    }, 10000)
    
    video.src = URL.createObjectURL(file)
  })
}

// Intersection Observer for lazy loading
export const createLazyLoader = (callback: (entries: IntersectionObserverEntry[]) => void) => {
  if (typeof window === 'undefined') return null
  
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1
  })
}

// Memory cleanup for components
export const cleanupResources = (urls: string[]) => {
  urls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
}