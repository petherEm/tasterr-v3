# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tasterr is a Next.js 15 application using React 19 that serves as a platform for FMCG (Fast-Moving Consumer Goods) product discovery and feedback. The app focuses on helping users share experiences about food and beverage products while providing valuable insights to brands and manufacturers.

## Key Commands

- **Development**: `npm run dev` (uses Turbopack)
- **Build**: `npm run build` (uses Turbopack)  
- **Start**: `npm start`
- **Lint**: `eslint` (use `npm run lint` though no script defined)
- **Type Check**: No dedicated script - TypeScript checking happens during build

## Technology Stack

### Core Framework
- **Next.js 15** with App Router
- **React 19** with React DOM 19
- **TypeScript** with strict configuration
- **Tailwind CSS 4** for styling

### Authentication & Database
- **Clerk** (`@clerk/nextjs`) for authentication
- **Supabase** for database with custom Clerk integration in `src/lib/supabase.ts`

### UI Components
- **Radix UI** primitives (Label, Radio Group, Select, Slot)
- **shadcn/ui** component system with `components.json` configuration
- **Lucide React** for icons
- **Framer Motion** for animations

### Form Handling
- **React Hook Form** with **Zod** validation
- **@hookform/resolvers/zod** for integration

### Utilities
- **class-variance-authority** for component variants
- **clsx** and **tailwind-merge** for conditional classes

## Architecture

### Directory Structure
- `src/app/` - App Router pages and layouts
- `src/components/ui/` - Reusable UI components (shadcn/ui)
- `src/components/shared/` - Shared layout components (Navbar, Footer)
- `src/components/main/` - Feature-specific components
- `src/lib/` - Utilities and configurations

### Key Components
- **Multi-step Survey Form** (`src/components/main/initial-info-form.tsx`) - Complex wizard-style form with animated transitions collecting user demographics and preferences
- **Supabase Integration** (`src/lib/supabase.ts`) - Custom client creation with Clerk token integration

### Authentication Flow
The app uses Clerk for authentication with Supabase integration. The Supabase client is configured to automatically pass Clerk tokens for RLS (Row Level Security).

### Form Validation Pattern
Forms use React Hook Form with Zod schemas for type-safe validation. The survey form demonstrates a multi-step pattern with progress tracking and conditional validation.

## Development Notes

### Path Aliases
Uses `@/*` alias mapping to `./src/*` for clean imports.

### Styling Approach
- Tailwind CSS 4 with PostCSS configuration
- Component variants using class-variance-authority
- Conditional styling with clsx and tailwind-merge utilities

### Animation Pattern
Framer Motion is used for page transitions and interactive elements, particularly in the survey form with enter/exit animations.

### Environment Configuration
The app expects Supabase environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required for admin panel)

## Admin Panel

The admin panel provides comprehensive survey management and user insights. Access is restricted to users with admin roles configured in Clerk.

### Admin Features
- **Dashboard**: Real-time statistics and recent survey completions
- **User Management**: Detailed user profiles with complete survey history
- **Survey Analytics**: Comprehensive view of demographic and research survey data
- **Role-based Access**: Secure admin-only access with Clerk integration

### Admin Setup
1. **Configure Admin Role in Clerk**:
   - Set `publicMetadata.role = 'admin'` or `privateMetadata.role = 'admin'` for admin users
   - Can be done via Clerk Dashboard or programmatically

2. **Add Service Role Key**:
   - Add `SUPABASE_SERVICE_ROLE_KEY` to your environment variables
   - This bypasses RLS for admin operations while maintaining security

3. **Access Admin Panel**:
   - Navigate to `/admin` when logged in as an admin user
   - Protected by middleware and server-side role checks

### Admin Routes
- `/admin` - Main dashboard with statistics and recent surveys
- `/admin/users/[userId]` - Detailed user survey information
- Protected by middleware with role-based access control

### Admin Architecture
- **Authentication**: Clerk roles with server-side verification
- **Data Access**: Service role Supabase client for comprehensive data access
- **Security**: RLS bypass only for verified admin operations
- **UI Components**: Consistent design system with existing project components

## Custom Surveys System

The application features a comprehensive custom surveys system that allows admins to create dynamic surveys and collect user responses. The system now includes advanced features like conversational AI-driven surveys and extensive multimedia question types.

### Core Survey Features
- **Dynamic Survey Builder**: Comprehensive admin interface for creating complex surveys with 11+ question types
- **Conversational AI Interface**: AI-powered survey experience using OpenAI integration with streaming responses
- **Advanced Question Types**: Text, multimedia, interactive, and specialized question formats
- **Survey Management**: Complete draft/publish/archive workflow with visibility controls
- **Response Analytics**: Individual and summary views with visual statistics and media handling
- **User Experience**: Both traditional and conversational survey modes with progress indicators

### Conversational Survey System
- **AI Integration**: `/api/survey-chat` endpoint using OpenAI's streaming API for real-time conversation
- **Test Mode**: Pre-survey AI chat for user engagement and question answering
- **Contextual Responses**: AI generates personalized transitions between questions based on user responses
- **Streaming Interface**: Real-time text streaming for natural conversation flow
- **Fallback Handling**: Graceful degradation when AI services are unavailable

### Advanced Question Types
1. **Text Input** - Short text responses
2. **Long Text (Textarea)** - Multi-line text areas
3. **Number** - Numeric input with validation
4. **Dropdown** - Single selection from predefined options
5. **Multiple Choice (Radio)** - Single selection with custom options
6. **Image Sorting** - Drag-and-drop image ranking by preference
7. **Image Selection** - Multi-select from provided images with min/max limits
8. **Image Commentary** - Comment on admin-provided images with custom prompts
9. **User Image Upload** - Users upload images with required comments (1-5 images)
10. **Video Upload** - User video responses with size/duration limits
11. **Video Questions** - Admin uploads video, users respond with text/video
12. **Range Slider** - Numeric scale selection with custom labels

### Survey Builder Architecture
- **Drag-and-Drop Interface**: Reorderable questions with visual feedback
- **Collapsible Question Editor**: Space-efficient editing with preview modes
- **Real-time Validation**: Zod schema validation with immediate feedback
- **Media Management**: Integrated Supabase storage for images and videos
- **Type-Safe Configuration**: TypeScript interfaces for all question option types

### Database Schema
- `custom_surveys` - Survey metadata, settings, and intro images
- `survey_questions` - Individual questions with polymorphic options storage
- `survey_responses` - User responses with JSON storage for complex data types
- Supabase storage buckets for survey images and videos

### API Architecture
- **Survey Chat API** (`/api/survey-chat/route.ts`):
  - Edge runtime for low latency
  - OpenAI integration with GPT-4o-mini/GPT-4o
  - Zod validation for request safety
  - Streaming text responses
  - Context-aware conversation management

### Survey Routes
- `/surveys` - Public survey listing with intro images
- `/surveys/[id]` - Conversational survey taking interface
- `/admin/surveys` - Admin survey management dashboard
- `/admin/surveys/create` - Advanced survey builder
- `/admin/surveys/[id]/responses` - Response analytics with media viewing

### Security & Performance
- **User Access**: RLS policies ensure users only see published surveys
- **Admin Access**: Service role bypasses RLS for comprehensive survey management
- **Response Protection**: One response per user per survey
- **Media Security**: Authenticated file uploads through Supabase storage
- **AI Safety**: Input sanitization and role filtering for AI interactions
- **Edge Runtime**: Low-latency API responses for better user experience

### Media Handling
- **Image Processing**: Automatic compression and optimization
- **Video Support**: MP4, WebM with size/duration limits
- **Storage Integration**: Supabase storage with authenticated uploads
- **Preview Generation**: Thumbnail creation for media assets
- **Responsive Display**: Adaptive media rendering in survey interface

### Integration Points
- **Clerk Authentication**: Seamless user management and role-based access
- **Supabase Backend**: Database, storage, and RLS security
- **OpenAI Services**: Conversational AI with streaming responses
- **React Hook Form**: Form state management with Zod validation
- **Framer Motion**: Smooth animations and transitions
- **shadcn/ui**: Consistent component library integration