export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      lesson_segments: {
        Row: {
          created_at: string
          description: string
          id: string
          lesson_id: string
          position: number
          status: string
          thumbnail_asset_id: string | null
          title: string
          updated_at: string
          video_asset_id: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          lesson_id: string
          position: number
          status?: string
          thumbnail_asset_id?: string | null
          title: string
          updated_at?: string
          video_asset_id?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          lesson_id?: string
          position?: number
          status?: string
          thumbnail_asset_id?: string | null
          title?: string
          updated_at?: string
          video_asset_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_segments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_segments_thumbnail_asset_id_fkey"
            columns: ["thumbnail_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_segments_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          created_at: string
          id: string
          media_asset_id: string
          name: string
          segment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_asset_id: string
          name: string
          segment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_asset_id?: string
          name?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_resources_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "lesson_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_segment_progress: {
        Row: {
          completed_at: string | null
          id: string
          lesson_id: string
          offering_id: string
          revision: number
          segment_id: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          video_position_seconds: number
        }
        Insert: {
          completed_at?: string | null
          id?: string
          lesson_id: string
          offering_id: string
          revision?: number
          segment_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_position_seconds?: number
        }
        Update: {
          completed_at?: string | null
          id?: string
          lesson_id?: string
          offering_id?: string
          revision?: number
          segment_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_position_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_segment_progress_offering_id_user_id_fkey"
            columns: ["offering_id", "user_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["offering_id", "user_id"]
          },
          {
            foreignKeyName: "lesson_segment_progress_segment_id_lesson_id_fkey"
            columns: ["segment_id", "lesson_id"]
            isOneToOne: false
            referencedRelation: "lesson_segments"
            referencedColumns: ["id", "lesson_id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          participation_id: string | null
          attempt_number: number
          created_at: string
          deadline_at: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          max_score: number | null
          offering_assessment_id: string
          score: number | null
          started_at: string
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          participation_id?: string | null
          attempt_number: number
          created_at?: string
          deadline_at?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_score?: number | null
          offering_assessment_id: string
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          participation_id?: string | null
          attempt_number?: number
          created_at?: string
          deadline_at?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_score?: number | null
          offering_assessment_id?: string
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_offering_assessment_id_fkey"
            columns: ["offering_assessment_id"]
            isOneToOne: false
            referencedRelation: "offering_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          position: number
          question_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          position: number
          question_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          points: number
          position: number
          prompt: string
          question_type: string
          settings: Json
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          points?: number
          position: number
          prompt: string
          question_type: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          points?: number
          position?: number
          prompt?: string
          question_type?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          attempt_id: string
          awarded_points: number | null
          created_at: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          media_asset_id: string | null
          question_id: string
          response: Json
          updated_at: string
        }
        Insert: {
          attempt_id: string
          awarded_points?: number | null
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          media_asset_id?: string | null
          question_id: string
          response?: Json
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          awarded_points?: number | null
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          media_asset_id?: string | null
          question_id?: string
          response?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          id: string
          instructions: string | null
          status: string
          supersedes_assessment_id: string | null
          title: string
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          status?: string
          supersedes_assessment_id?: string | null
          title: string
          type: string
          updated_at?: string
          version?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          status?: string
          supersedes_assessment_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_supersedes_assessment_id_fkey"
            columns: ["supersedes_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          group_type: string
          course_id: string
          created_at: string
          description: string | null
          id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          group_type?: string
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          position: number
          title: string
          updated_at?: string
        }
        Update: {
          group_type?: string
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_offerings: {
        Row: {
          capacity: number | null
          course_id: string
          created_at: string
          delivery_mode: string
          ends_at: string | null
          enrollment_closes_at: string | null
          enrollment_opens_at: string | null
          id: string
          name: string
          starts_at: string | null
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          course_id: string
          created_at?: string
          delivery_mode?: string
          ends_at?: string | null
          enrollment_closes_at?: string | null
          enrollment_opens_at?: string | null
          id?: string
          name: string
          starts_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          course_id?: string
          created_at?: string
          delivery_mode?: string
          ends_at?: string | null
          enrollment_closes_at?: string | null
          enrollment_opens_at?: string | null
          id?: string
          name?: string
          starts_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_offerings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_staff: {
        Row: {
          course_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_staff_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          slug: string
          status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id: string
          slug: string
          status?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          enrolled_at: string | null
          expires_at: string | null
          id: string
          offering_id: string
          source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          enrolled_at?: string | null
          expires_at?: string | null
          id?: string
          offering_id: string
          source?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          enrolled_at?: string | null
          expires_at?: string | null
          id?: string
          offering_id?: string
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_blocks: {
        Row: {
          block_type: string
          content: Json
          created_at: string
          id: string
          lesson_id: string
          media_asset_id: string | null
          position: number
          updated_at: string
        }
        Insert: {
          block_type: string
          content?: Json
          created_at?: string
          id?: string
          lesson_id: string
          media_asset_id?: string | null
          position: number
          updated_at?: string
        }
        Update: {
          block_type?: string
          content?: Json
          created_at?: string
          id?: string
          lesson_id?: string
          media_asset_id?: string | null
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_accessed_at: string | null
          lesson_id: string
          offering_id: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          video_position_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          lesson_id: string
          offering_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_position_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string
          offering_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_position_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_offering_id_user_id_fkey"
            columns: ["offering_id", "user_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["offering_id", "user_id"]
          },
        ]
      }
      lessons: {
        Row: {
          description: string
          created_at: string
          estimated_duration_seconds: number | null
          id: string
          module_id: string
          position: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          description?: string
          created_at?: string
          estimated_duration_seconds?: number | null
          id?: string
          module_id: string
          position: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          description?: string
          created_at?: string
          estimated_duration_seconds?: number | null
          id?: string
          module_id?: string
          position?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          bucket: string
          created_at: string
          id: string
          kind: string
          mime_type: string
          object_path: string
          offering_id: string | null
          organization_id: string
          original_filename: string
          size_bytes: number | null
          status: string
          storage_provider: string
          updated_at: string
          upload_expires_at: string
          uploaded_by: string
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: string
          kind: string
          mime_type: string
          object_path: string
          offering_id?: string | null
          organization_id: string
          original_filename: string
          size_bytes?: number | null
          status?: string
          storage_provider?: string
          updated_at?: string
          upload_expires_at?: string
          uploaded_by: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          kind?: string
          mime_type?: string
          object_path?: string
          offering_id?: string | null
          organization_id?: string
          original_filename?: string
          size_bytes?: number | null
          status?: string
          storage_provider?: string
          updated_at?: string
          upload_expires_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offering_assessments: {
        Row: {
          assessment_id: string
          closes_at: string | null
          created_at: string
          id: string
          max_attempts: number | null
          offering_id: string
          opens_at: string | null
          published: boolean
          shuffle_options: boolean
          shuffle_questions: boolean
          time_limit_seconds: number | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          closes_at?: string | null
          created_at?: string
          id?: string
          max_attempts?: number | null
          offering_id: string
          opens_at?: string | null
          published?: boolean
          shuffle_options?: boolean
          shuffle_questions?: boolean
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          closes_at?: string | null
          created_at?: string
          id?: string
          max_attempts?: number | null
          offering_id?: string
          opens_at?: string | null
          published?: boolean
          shuffle_options?: boolean
          shuffle_questions?: boolean
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offering_assessments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offering_assessments_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      offering_staff: {
        Row: {
          created_at: string
          id: string
          offering_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offering_id: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offering_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offering_staff_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offering_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          joined_at: string | null
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string | null
          organization_id: string
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string | null
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_lesson_upload: {Args:{p_course_id:string;p_asset_id:string};Returns:Json}
      register_lesson_upload: {Args:{p_course_id:string;p_mime:string;p_filename:string};Returns:Json}
      archive_unused_lesson_upload: {Args:{p_asset_id:string};Returns:undefined}
      edit_learning_content: {Args:{p_course_id:string;p_action:string;p_id:string|null;p_parent_id:string|null;p_updated_at:string|null;p_data:Json};Returns:string}
      save_segment_progress: {Args:{p_offering_id:string;p_segment_id:string;p_position:number;p_complete:boolean;p_revision:number};Returns:Json}
      sync_exam_participation: { Args: { p_schedule_id: string }; Returns: Json }
      decide_exam_retry: { Args: { p_schedule_id: string; p_decision: string; p_expected_revision: number }; Returns: Json }
      save_exam_response: { Args: { p_attempt_id: string; p_question_id: string; p_response: Json | null; p_media_asset_id: string | null; p_expected_revision: number }; Returns: Json }
      // Checked exam workflow RPCs from applied development migration 20.
      save_exam_answers: { Args: { p_attempt_id: string; p_expected_revision: number; p_answers: Json }; Returns: Json }
      get_exam_definition_v2: { Args: { p_schedule_id: string }; Returns: Json }
      save_exam_definition_v2: { Args: { p_offering_id: string; p_schedule_id: string | null; p_expected_updated_at: string | null; p_definition: Json }; Returns: string }
      clone_exam_schedule: { Args: { p_schedule_id: string }; Returns: string }
      grade_exam_paper: { Args: { p_attempt_id: string; p_expected_revision: number; p_scores: Json; p_feedback: string; p_reason: string | null; p_request_id: string }; Returns: Json }
      get_exam_grade_changes: { Args: { p_attempt_id: string }; Returns: Json }
      get_exam_submission_page: { Args: { p_schedule_id: string; p_after?: string | null; p_limit?: number }; Returns: Json }
      get_exam_definition: { Args: { p_schedule_id: string }; Returns: Json }
      save_exam_definition: { Args: { p_offering_id: string; p_schedule_id: string | null; p_expected_updated_at: string | null; p_definition: Json }; Returns: string }
      release_exam_result: { Args: { p_schedule_id: string; p_user_id: string; p_expected_revision: number }; Returns: Json }
      release_exam_review: { Args: { p_schedule_id: string; p_user_id: string; p_expected_revision: number }; Returns: Json }
      get_exam_grading_detail: { Args: { p_attempt_id: string }; Returns: Json }
      get_exam_review: { Args: { p_schedule_id: string }; Returns: Json }
      get_exam_attempt_content: { Args: { p_attempt_id: string }; Returns: Json }
      get_exam_summaries: { Args: { p_schedule_ids: string[] }; Returns: Json }
      abandon_media_upload: { Args: { p_asset_id: string }; Returns: undefined }
      clone_assessment: {
        Args: { p_assessment_id: string; p_title?: string }
        Returns: string
      }
      complete_media_upload: {
        Args: { p_asset_id: string }
        Returns: undefined
      }
      create_organization: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      create_teacher_course: {
        Args: { p_organization_id: string; p_slug: string; p_title: string }
        Returns: string
      }
      current_profile_id: { Args: never; Returns: string }
      finalize_assessment_grade: {
        Args: { p_attempt_id: string }
        Returns: undefined
      }
      get_assessment_answer_keys: {
        Args: { p_assessment_id: string }
        Returns: Json
      }
      get_assessment_results: { Args: { p_attempt_id: string }; Returns: Json }
      grade_assessment_response: {
        Args: { p_feedback?: string; p_points: number; p_response_id: string }
        Returns: undefined
      }
      onboard_firebase_profile: { Args: never; Returns: string }
      revoke_my_firebase_identity: { Args: never; Returns: undefined }
      save_assessment_response: {
        Args: {
          p_attempt_id: string
          p_media_asset_id?: string
          p_question_id: string
          p_response: Json
        }
        Returns: string
      }
      set_assessment_answer_key: {
        Args: { p_answer: Json; p_question_id: string }
        Returns: undefined
      }
      start_assessment_attempt: {
        Args: { p_offering_assessment_id: string }
        Returns: string
      }
      submit_assessment_attempt: {
        Args: { p_attempt_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
