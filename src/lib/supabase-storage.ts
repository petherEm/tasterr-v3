import { SupabaseClient } from '@supabase/supabase-js'

// File upload utilities
export const uploadFile = async (
  supabaseClient: SupabaseClient,
  file: File, 
  bucket: string, 
  path: string,
  options?: {
    cacheControl?: string
    contentType?: string
  }
) => {
  try {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: options?.cacheControl || '3600',
        contentType: options?.contentType || file.type,
        upsert: false
      })

    if (error) throw error

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(path)

    return {
      success: true,
      data: {
        path: data.path,
        fullPath: data.fullPath,
        publicUrl: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

// Delete file
export const deleteFile = async (supabaseClient: SupabaseClient, bucket: string, path: string) => {
  try {
    const { error } = await supabaseClient.storage
      .from(bucket)
      .remove([path])

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

// Generate unique file path
export const generateFilePath = (userId: string, surveyId: string, fileName: string, type: 'image' | 'video') => {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  const extension = fileName.split('.').pop()
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  
  return `surveys/${surveyId}/${type}s/${userId}/${timestamp}_${randomId}_${cleanFileName}`
}

// Validate file constraints
export const validateFile = (
  file: File,
  constraints: {
    maxSizeBytes: number
    allowedTypes: string[]
    maxDurationSeconds?: number
  }
): Promise<{
  valid: boolean
  error?: string
  duration?: number
}> => {
  return new Promise((resolve) => {
    // Check file size
    if (file.size > constraints.maxSizeBytes) {
      resolve({
        valid: false,
        error: `File too large. Maximum size is ${Math.round(constraints.maxSizeBytes / 1024 / 1024)}MB`
      })
      return
    }

    // Check file type
    const isValidType = constraints.allowedTypes.some(type => 
      file.type.includes(type) || file.name.toLowerCase().endsWith(`.${type}`)
    )
    
    if (!isValidType) {
      resolve({
        valid: false,
        error: `Invalid file type. Allowed: ${constraints.allowedTypes.join(', ')}`
      })
      return
    }

    // For video files, check duration
    if (file.type.includes('video') && constraints.maxDurationSeconds) {
      const video = document.createElement('video')
      video.preload = 'metadata'
      
      const cleanup = () => {
        URL.revokeObjectURL(video.src)
        video.remove()
      }

      video.onloadedmetadata = () => {
        const duration = video.duration
        cleanup()
        
        if (duration > constraints.maxDurationSeconds!) {
          resolve({
            valid: false,
            error: `Video too long. Maximum duration is ${constraints.maxDurationSeconds} seconds`
          })
          return
        }
        
        resolve({ valid: true, duration })
      }
      
      video.onerror = () => {
        cleanup()
        resolve({ valid: false, error: 'Invalid video file' })
      }
      
      // Timeout after 10 seconds
      setTimeout(() => {
        cleanup()
        resolve({ valid: false, error: 'Video validation timeout' })
      }, 10000)
      
      video.src = URL.createObjectURL(file)
    } else {
      // For non-video files, validation is complete
      resolve({ valid: true })
    }
  })
}

// Image compression utility (optional)
export const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })
          resolve(compressedFile)
        } else {
          resolve(file) // Fallback to original
        }
      }, file.type, quality)
      
      URL.revokeObjectURL(img.src)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      resolve(file) // Fallback to original
    }
    
    img.src = URL.createObjectURL(file)
  })
}