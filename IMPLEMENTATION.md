# Enhanced Survey System Implementation

This document outlines the implementation of advanced survey question types with UploadThing integration.

## 🎯 New Question Types Implemented

### 1. Image Sorting Questions (`image_sort`)
- **Component**: `ImageSortQuestion`
- **Features**: 
  - Drag-and-drop reordering with @dnd-kit
  - Visual ranking indicators (1, 2, 3...)
  - Smooth animations with Framer Motion
  - Touch-friendly mobile interactions
- **Data Format**: Array of ordered image IDs
- **Admin Config**: Upload images, set sort type (preference/ranking)

### 2. Image Selection Questions (`image_select`)  
- **Component**: `ImageSelectQuestion`
- **Features**:
  - Multi-select with configurable limits
  - Visual selection states with checkmarks
  - Progress indicator showing selections
  - Responsive grid layout
- **Data Format**: Array of selected image IDs
- **Admin Config**: Upload images, set min/max selections

### 3. Video Upload Questions (`video_upload`)
- **Component**: `VideoUploadQuestion` 
- **Features**:
  - Drag-and-drop video upload
  - Client-side validation (size, duration, format)
  - Upload progress indication
  - Video preview with controls
- **Data Format**: VideoUploadResponse object with metadata
- **Admin Config**: File constraints, recording permissions

### 4. Range Slider Questions (`range`)
- **Component**: `RangeSliderQuestion`
- **Features**:
  - Custom-styled Radix UI slider
  - Configurable min/max/step values
  - Visual value display and progress
  - Accessible keyboard navigation
- **Data Format**: Numeric value
- **Admin Config**: Range settings, labels, display options

## 🗄️ Database Schema Updates

### Extended Question Types
```sql
-- Updated constraint to include new question types
ALTER TABLE survey_questions 
ADD CONSTRAINT survey_questions_question_type_check 
CHECK (question_type IN (
  'input', 'select', 'radio', 'textarea', 'number',
  'image_sort', 'image_select', 'video_upload', 'range'
));
```

### File Upload Tracking
```sql
-- New table for tracking uploaded files
CREATE TABLE survey_uploads (
  id UUID PRIMARY KEY,
  survey_id UUID REFERENCES custom_surveys(id),
  question_id UUID REFERENCES survey_questions(id),
  user_id TEXT, -- NULL for admin uploads
  upload_key TEXT NOT NULL, -- UploadThing key
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  upload_type TEXT CHECK (upload_type IN ('survey_image', 'video_response')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

## 📁 File Upload Architecture

### UploadThing Integration
- **Survey Images**: Admin uploads for image questions (max 4MB, 10 files)
- **Video Responses**: User video uploads (max 50MB, MP4 only)
- **Security**: Server-side validation, authentication middleware
- **Storage**: Organized by survey/question structure

### File Validation Pipeline
1. **Client-side**: Format, size, duration validation
2. **Upload**: Progress tracking with UploadThing
3. **Server-side**: Additional security validation
4. **Storage**: Metadata tracking in database

## 🎨 UI/UX Enhancements

### Component Architecture
- **Base Props**: Consistent interface for all question types
- **Type Safety**: Full TypeScript integration
- **Accessibility**: ARIA labels, keyboard navigation
- **Animations**: Smooth transitions with Framer Motion
- **Responsive**: Mobile-first design approach

### Admin Experience
- **Visual Builder**: Type-specific configuration panels
- **Live Preview**: Real-time question preview
- **File Management**: Upload progress, error handling
- **Validation**: Form validation with clear error messages

### User Experience  
- **Progressive Enhancement**: Works without JavaScript
- **Performance**: Lazy loading of heavy components
- **Feedback**: Visual progress indicators
- **Validation**: Real-time response validation

## ⚡ Performance Optimizations

### Code Splitting
```typescript
// Lazy loading for heavy interactive components
export const ImageSortQuestion = lazy(() => 
  import("./image-sort-question")
)
```

### Image Optimization
- WebP format conversion via UploadThing
- Responsive image sizes
- Lazy loading with intersection observer

### Memory Management
- Blob URL cleanup
- Component unmounting optimization
- Efficient re-renders with React.memo

### Bundle Size
- Tree-shaking friendly exports
- Selective imports from UI libraries
- Optimized dependency usage

## 🔧 Configuration

### Environment Variables
```bash
# UploadThing (required for file uploads)
UPLOADTHING_SECRET=your_secret_key
UPLOADTHING_APP_ID=your_app_id

# Existing Clerk & Supabase vars still required
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### File Upload Limits
- **Images**: 4MB max, JPG/PNG/WebP formats
- **Videos**: 50MB max, MP4 format only
- **Duration**: Configurable per question (default 60s)

## 🚀 Deployment Checklist

1. **Database Migration**: Run `extended-surveys-schema.sql`
2. **Environment Setup**: Configure UploadThing credentials
3. **File Storage**: Verify UploadThing app configuration
4. **Admin Access**: Set up admin roles in Clerk
5. **Testing**: Validate all question types in survey flow

## 📊 Data Structure Examples

### Image Sort Response
```json
{
  "question_123": ["img_3", "img_1", "img_2"]
}
```

### Video Upload Response  
```json
{
  "question_456": {
    "fileName": "user_video.mp4",
    "filePath": "https://uploadthing.com/f/...",
    "fileSize": 15728640,
    "uploadKey": "abc123",
    "uploadedAt": "2025-01-15T10:30:00Z"
  }
}
```

### Range Slider Response
```json
{
  "question_789": 7
}
```

## 🔒 Security Considerations

- **File Validation**: Multi-layer validation (client + server)
- **Access Control**: RLS policies for user data isolation
- **Upload Security**: UploadThing handles file scanning
- **Data Sanitization**: All user inputs properly escaped
- **Rate Limiting**: Built into UploadThing service

This implementation provides a robust, scalable foundation for advanced survey interactions while maintaining performance and security best practices.