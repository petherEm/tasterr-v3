export interface SurveyData {
  age?: string;
  gender?: string;
  citySize: string;
  shoppingFrequency: string;
  preferredBrand?: string;
  profession: string;
}

export interface UserSurvey {
  id?: string;
  user_id: string;
  age?: string;
  gender?: string;
  city_size: string;
  shopping_frequency: string;
  preferred_brand?: string;
  profession: string;
  created_at?: string;
  updated_at?: string;
}


// Custom Surveys Types
export interface CustomSurvey {
  id?: string;
  title: string;
  description?: string;
  introduction: string;
  intro_image_url?: string;
  created_by: string;
  status: 'draft' | 'published' | 'archived';
  target_audience: 'all' | 'new_users' | 'existing_users';
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  expires_at?: string;
}

// Survey Category Interface
export interface SurveyCategory {
  id?: string;
  survey_id: string;
  name: string;
  description?: string;
  order_index: number;
  color?: string; // hex color for UI styling
  icon?: string; // lucide icon name
  created_at?: string;
}

// AI Assistance Configuration
export interface AIAssistanceConfig {
  enabled: boolean;
  assistance_type: 'clarification' | 'validation' | 'enhancement' | 'all';
  maxRetries?: number; // How many times AI can ask to reconsider (default: 2)
  confidence_threshold?: number; // AI confidence level to trigger assistance (0-1, default: 0.7)
  prompt?: string; // Custom prompt for AI assistance
  triggers?: {
    short_answers?: boolean; // Trigger on very short text responses
    incomplete_data?: boolean; // Trigger on missing required details
    inconsistent_data?: boolean; // Trigger on contradictory answers
  };
}

// AI Assistance Evaluation Result
export interface AIAssistanceEvaluation {
  needsAssistance: boolean;
  confidence: number; // 0-1 confidence score
  feedback: string; // AI feedback message for user
  suggestions?: string[]; // Specific suggestions for improvement
  assistanceType: 'clarification' | 'validation' | 'enhancement' | 'none';
  retryCount?: number; // How many times this question has been assisted
}

export interface SurveyQuestion {
  id?: string;
  survey_id: string;
  category_id?: string; // Optional category assignment
  question_text: string;
  question_subtitle?: string;
  question_type: QuestionType;
  options?: QuestionOptions;
  is_required: boolean;
  order_index: number;
  ai_assistance_enabled: boolean;
  ai_assistance_config?: AIAssistanceConfig;
  created_at?: string;
}

// Extended question type enum
export type QuestionType =
  | 'input'
  | 'select'
  | 'radio'
  | 'textarea'
  | 'number'
  | 'image_sort'
  | 'image_select'
  | 'image_comment'
  | 'image_upload_comment'
  | 'video_upload'
  | 'video_question'
  | 'range';

// Union type for different question option structures
export type QuestionOptions =
  | SelectRadioOptions[]     // For select/radio
  | ImageQuestionOptions     // For image sorting/selection
  | ImageCommentOptions      // For image commenting
  | ImageUploadCommentOptions // For user image upload with comments
  | VideoUploadOptions       // For video upload
  | VideoQuestionOptions     // For video question (admin uploads video)
  | RangeSliderOptions       // For range/slider
  | null;                    // For input/textarea/number

// Existing option type (renamed for clarity)
export interface SelectRadioOptions {
  value: string;
  label: string;
}

// New option types for extended question functionality
export interface ImageQuestionOptions {
  images: ImageOption[];
  sortType?: 'ranking' | 'preference';  // For image_sort
  maxSelections?: number;               // For image_select
  minSelections?: number;               // For image_select
  instruction?: string;
}

export interface ImageOption {
  id: string;
  url: string;
  alt: string;
  title?: string;
  thumbnailUrl?: string;
  uploadKey?: string; // UploadThing key for management
}

export interface VideoUploadOptions {
  maxSizeBytes: number;
  maxDurationSeconds: number;
  acceptedFormats: string[];
  instruction?: string;
  allowRecording?: boolean;
}

export interface VideoQuestionOptions {
  video?: VideoOption;
  responseType: 'text' | 'video' | 'both';
  instruction?: string;
  maxTextLength?: number;
  videoUploadOptions?: VideoUploadOptions;
}

export interface VideoOption {
  id: string;
  url: string;
  title?: string;
  thumbnailUrl?: string;
  duration?: number;
  uploadKey?: string;
}

export interface ImageCommentOptions {
  images: ImageCommentItem[];
  instruction?: string;
  maxTextLength?: number;
  textPrompt?: string;
}

export interface ImageCommentItem {
  id: string;
  url: string;
  alt: string;
  title?: string;
  uploadKey?: string;
  textPrompt?: string; // Individual prompt for each image
}

export interface ImageUploadCommentOptions {
  maxImages: number; // Maximum number of images user can upload (1-5)
  minImages: number; // Minimum number of images required (0-5)
  instruction?: string;
  imagePrompt?: string; // Prompt for each image the user uploads
  maxTextLength?: number; // Max characters per image comment
  allowedFormats?: string[]; // ['jpg', 'png', 'webp']
  maxFileSize?: number; // Max file size in bytes per image
  requireCommentForEach?: boolean; // Whether comment is required for each image
}

export interface RangeSliderOptions {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  labels: {
    min: string;
    max: string;
  };
  showValue: boolean;
  instruction?: string;
}

// Legacy option type for backward compatibility
export interface QuestionOption {
  value: string;
  label: string;
}

export interface SurveyResponse {
  id?: string;
  survey_id: string;
  user_id: string;
  response_data: Record<string, any>;
  completed_at?: string;
}

export interface CustomSurveyWithQuestions extends CustomSurvey {
  questions: SurveyQuestion[];
}

// Extended survey interface for public display with computed fields
export interface PublicSurvey extends CustomSurveyWithQuestions {
  response_count?: number;
  estimated_time?: number;
}

// Enhanced survey interface with categories
export interface CustomSurveyWithCategories extends CustomSurvey {
  categories: SurveyCategory[];
  questions: SurveyQuestionWithCategory[];
}

// Survey question with populated category data
export interface SurveyQuestionWithCategory extends SurveyQuestion {
  category?: SurveyCategory; // Populated category data
}

// Grouped questions by category for easy rendering
export interface CategorizedQuestions {
  [categoryId: string]: {
    category: SurveyCategory;
    questions: SurveyQuestion[];
  };
}

// Category progress tracking
export interface CategoryProgress {
  categoryId: string;
  categoryName: string;
  currentQuestion: number;
  totalQuestions: number;
  completedQuestions: number;
  isComplete: boolean;
}

export interface SurveyWithResponses extends CustomSurvey {
  questions: SurveyQuestion[];
  responses: SurveyResponse[];
  response_count: number;
}

// Enhanced response with user profile data
export interface SurveyResponseWithProfile extends SurveyResponse {
  user_profile?: UserSurvey | null;
}

export interface SurveyWithResponsesAndProfiles extends CustomSurvey {
  questions: SurveyQuestion[];
  responses: SurveyResponseWithProfile[];
  response_count: number;
}

// Analytics interfaces
export interface DemographicBreakdown {
  [key: string]: number;
}

export interface SurveyAnalytics {
  total_responses: number;
  demographics: {
    age_groups: DemographicBreakdown;
    gender: DemographicBreakdown;
    city_size: DemographicBreakdown;
    shopping_frequency: DemographicBreakdown;
    profession: DemographicBreakdown;
  };
  response_quality: {
    avg_completion_time: number;
    completion_rate: number;
  };
}

// Response data types for new question types
export interface VideoUploadResponse {
  fileName: string;
  filePath: string;
  fileSize: number;
  duration?: number;
  uploadedAt: string;
  thumbnailUrl?: string;
  uploadKey: string; // UploadThing key
}

// File upload types for UploadThing integration
export interface FileUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // For videos
}

// Upload tracking
export interface SurveyUpload {
  id?: string;
  survey_id: string;
  question_id?: string;
  user_id?: string;
  upload_key: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  upload_type: 'survey_image' | 'video_response';
  metadata?: Record<string, any>;
  created_at?: string;
}

// Component props interfaces
export interface BaseQuestionProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: any) => void;
  className?: string;
}

export interface ImageSortQuestionProps extends BaseQuestionProps {
  value: string[]; // ordered array of image IDs
  onChange: (orderedIds: string[]) => void;
}

export interface ImageSelectQuestionProps extends BaseQuestionProps {
  value: string[]; // selected image IDs
  onChange: (selectedIds: string[]) => void;
}

export interface VideoUploadQuestionProps extends BaseQuestionProps {
  value: VideoUploadResponse | null;
  onChange: (video: VideoUploadResponse | null) => void;
}

export interface RangeSliderQuestionProps extends BaseQuestionProps {
  value: number;
  onChange: (value: number) => void;
}