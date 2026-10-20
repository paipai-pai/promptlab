
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "experiments": {
                  Row: {
                    "created_at": string,"failure_reason": string | null,"id": string,"input_variables": NonNullable<Json>,"model_name": string,"notes": string | null,"output_text": string | null,"prompt_version_id": string,"rating": number | null,"rendered_prompt": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"failure_reason"?: string | null,"id"?: string,"input_variables"?: NonNullable<Json>,"model_name": string,"notes"?: string | null,"output_text"?: string | null,"prompt_version_id": string,"rating"?: number | null,"rendered_prompt": string,"status": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"failure_reason"?: string | null,"id"?: string,"input_variables"?: NonNullable<Json>,"model_name"?: string,"notes"?: string | null,"output_text"?: string | null,"prompt_version_id"?: string,"rating"?: number | null,"rendered_prompt"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "experiments_prompt_version_owner_fkey"
      columns: ["prompt_version_id","user_id"]
isOneToOne: false
      referencedRelation: "prompt_versions"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"prompt_versions": {
                  Row: {
                    "change_note": string | null,"content": string,"created_at": string,"id": string,"prompt_id": string,"user_id": string,"version_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "change_note"?: string | null,"content": string,"created_at"?: string,"id"?: string,"prompt_id": string,"user_id": string,"version_number": number
                  }
                  Update: {
                    "change_note"?: string | null,"content"?: string,"created_at"?: string,"id"?: string,"prompt_id"?: string,"user_id"?: string,"version_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "prompt_versions_prompt_owner_fkey"
      columns: ["prompt_id","user_id"]
isOneToOne: false
      referencedRelation: "prompts"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"prompts": {
                  Row: {
                    "category": string,"created_at": string,"description": string,"id": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"created_at"?: string,"description"?: string,"id"?: string,"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"description"?: string,"id"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "append_prompt_version":
{ Args: { "p_change_note"?: string,"p_content": string,"p_prompt_id": string }; Returns: {
              "prompt_version_id": string,"version_number": number
            }[]
                           },
"create_prompt_with_initial_version":
{ Args: { "p_category": string,"p_change_note"?: string,"p_content": string,"p_description": string,"p_title": string }; Returns: {
              "prompt_id": string,"prompt_version_id": string
            }[]
                           },
"list_prompts":
{ Args: { "p_category"?: string,"p_page"?: number,"p_page_size"?: number,"p_query"?: string }; Returns: {
              "category": string,"created_at": string,"description": string,"id": string,"latest_content": string,"latest_version_created_at": string,"latest_version_id": string,"latest_version_number": number,"title": string,"total_count": number,"updated_at": string
            }[]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {

          }
        },"public": {
          Enums: {

          }
        }
} as const
