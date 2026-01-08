export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          parent_id: string | null
          unit_id: string
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          parent_id?: string | null
          unit_id: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          parent_id?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          id: string
          new_values: Json | null
          old_values: Json | null
          performed_at: string | null
          performed_by: string | null
          record_id: string
          table_name: string
          unit_id: string | null
        }
        Insert: {
          action: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          record_id: string
          table_name: string
          unit_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          record_id?: string
          table_name?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_charges: {
        Row: {
          amount: number
          billing_record_id: string
          id: string
          is_paid: boolean | null
          scout_account_id: string
        }
        Insert: {
          amount: number
          billing_record_id: string
          id?: string
          is_paid?: boolean | null
          scout_account_id: string
        }
        Update: {
          amount?: number
          billing_record_id?: string
          id?: string
          is_paid?: boolean | null
          scout_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_charges_billing_record_id_fkey"
            columns: ["billing_record_id"]
            isOneToOne: false
            referencedRelation: "billing_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_charges_scout_account_id_fkey"
            columns: ["scout_account_id"]
            isOneToOne: false
            referencedRelation: "scout_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_records: {
        Row: {
          billing_date: string
          created_at: string | null
          created_by: string | null
          description: string
          event_id: string | null
          id: string
          journal_entry_id: string | null
          total_amount: number
          unit_id: string
        }
        Insert: {
          billing_date: string
          created_at?: string | null
          created_by?: string | null
          description: string
          event_id?: string | null
          id?: string
          journal_entry_id?: string | null
          total_amount: number
          unit_id: string
        }
        Update: {
          billing_date?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_id?: string | null
          id?: string
          journal_entry_id?: string | null
          total_amount?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          event_id: string
          id: string
          is_driver: boolean | null
          notes: string | null
          profile_id: string | null
          responded_at: string | null
          scout_id: string | null
          status: string
          vehicle_seats: number | null
        }
        Insert: {
          event_id: string
          id?: string
          is_driver?: boolean | null
          notes?: string | null
          profile_id?: string | null
          responded_at?: string | null
          scout_id?: string | null
          status: string
          vehicle_seats?: number | null
        }
        Update: {
          event_id?: string
          id?: string
          is_driver?: boolean | null
          notes?: string | null
          profile_id?: string | null
          responded_at?: string | null
          scout_id?: string | null
          status?: string
          vehicle_seats?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cost_per_adult: number | null
          cost_per_scout: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string | null
          id: string
          location: string | null
          max_participants: number | null
          rsvp_deadline: string | null
          start_date: string
          title: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          cost_per_adult?: number | null
          cost_per_scout?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          max_participants?: number | null
          rsvp_deadline?: string | null
          start_date: string
          title: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          cost_per_adult?: number | null
          cost_per_scout?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          max_participants?: number | null
          rsvp_deadline?: string | null
          start_date?: string
          title?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_checkouts: {
        Row: {
          checked_out_at: string | null
          id: string
          inventory_item_id: string
          notes: string | null
          quantity_out: number
          quantity_returned: number | null
          quantity_sold: number | null
          returned_at: string | null
          scout_id: string
          settled_at: string | null
        }
        Insert: {
          checked_out_at?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          quantity_out: number
          quantity_returned?: number | null
          quantity_sold?: number | null
          returned_at?: string | null
          scout_id: string
          settled_at?: string | null
        }
        Update: {
          checked_out_at?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          quantity_out?: number
          quantity_returned?: number | null
          quantity_sold?: number | null
          returned_at?: string | null
          scout_id?: string
          settled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_checkouts_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_checkouts_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          name: string
          quantity_on_hand: number | null
          sale_price: number | null
          sku: string | null
          unit_cost: number | null
          unit_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          quantity_on_hand?: number | null
          sale_price?: number | null
          sku?: string | null
          unit_cost?: number | null
          unit_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          quantity_on_hand?: number | null
          sale_price?: number | null
          sku?: string | null
          unit_cost?: number | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          entry_date: string
          entry_type: string | null
          id: string
          is_posted: boolean | null
          is_void: boolean | null
          posted_at: string | null
          reference: string | null
          unit_id: string
          void_reason: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          entry_date: string
          entry_type?: string | null
          id?: string
          is_posted?: boolean | null
          is_void?: boolean | null
          posted_at?: string | null
          reference?: string | null
          unit_id: string
          void_reason?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_type?: string | null
          id?: string
          is_posted?: boolean | null
          is_void?: boolean | null
          posted_at?: string | null
          reference?: string | null
          unit_id?: string
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          credit: number | null
          debit: number | null
          id: string
          journal_entry_id: string
          memo: string | null
          scout_account_id: string | null
        }
        Insert: {
          account_id: string
          credit?: number | null
          debit?: number | null
          id?: string
          journal_entry_id: string
          memo?: string | null
          scout_account_id?: string | null
        }
        Update: {
          account_id?: string
          credit?: number | null
          debit?: number | null
          id?: string
          journal_entry_id?: string
          memo?: string | null
          scout_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_scout_account_id_fkey"
            columns: ["scout_account_id"]
            isOneToOne: false
            referencedRelation: "scout_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          fee_amount: number | null
          id: string
          journal_entry_id: string | null
          net_amount: number
          notes: string | null
          payment_method: string | null
          scout_account_id: string | null
          square_payment_id: string | null
          square_receipt_url: string | null
          status: string | null
          unit_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          fee_amount?: number | null
          id?: string
          journal_entry_id?: string | null
          net_amount: number
          notes?: string | null
          payment_method?: string | null
          scout_account_id?: string | null
          square_payment_id?: string | null
          square_receipt_url?: string | null
          status?: string | null
          unit_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          fee_amount?: number | null
          id?: string
          journal_entry_id?: string | null
          net_amount?: number
          notes?: string | null
          payment_method?: string | null
          scout_account_id?: string | null
          square_payment_id?: string | null
          square_receipt_url?: string | null
          status?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_scout_account_id_fkey"
            columns: ["scout_account_id"]
            isOneToOne: false
            referencedRelation: "scout_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          email_secondary: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone_primary: string | null
          phone_secondary: string | null
          address_street: string | null
          address_city: string | null
          address_state: string | null
          address_zip: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          email_secondary?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          address_street?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          email_secondary?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          address_street?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scout_accounts: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          scout_id: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          scout_id: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          scout_id?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scout_accounts_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: true
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_accounts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_guardians: {
        Row: {
          id: string
          is_primary: boolean | null
          profile_id: string
          relationship: string | null
          scout_id: string
        }
        Insert: {
          id?: string
          is_primary?: boolean | null
          profile_id: string
          relationship?: string | null
          scout_id: string
        }
        Update: {
          id?: string
          is_primary?: boolean | null
          profile_id?: string
          relationship?: string | null
          scout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_guardians_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_guardians_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      scouts: {
        Row: {
          bsa_member_id: string | null
          created_at: string | null
          date_of_birth: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          patrol: string | null
          rank: string | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          bsa_member_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          patrol?: string | null
          rank?: string | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          bsa_member_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          patrol?: string | null
          rank?: string | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scouts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_invites: {
        Row: {
          id: string
          unit_id: string
          email: string
          role: string
          invited_by: string
          status: string
          created_at: string | null
          expires_at: string | null
          accepted_at: string | null
          scout_ids: string[] | null
        }
        Insert: {
          id?: string
          unit_id: string
          email: string
          role: string
          invited_by: string
          status?: string
          created_at?: string | null
          expires_at?: string | null
          accepted_at?: string | null
          scout_ids?: string[] | null
        }
        Update: {
          id?: string
          unit_id?: string
          email?: string
          role?: string
          invited_by?: string
          status?: string
          created_at?: string | null
          expires_at?: string | null
          accepted_at?: string | null
          scout_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_invites_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_memberships: {
        Row: {
          id: string
          unit_id: string
          profile_id: string | null
          email: string | null
          role: string
          status: string
          is_active: boolean | null
          scout_ids: string[] | null
          invited_by: string | null
          invited_at: string | null
          accepted_at: string | null
          expires_at: string | null
          joined_at: string | null
        }
        Insert: {
          id?: string
          unit_id: string
          profile_id?: string | null
          email?: string | null
          role: string
          status?: string
          is_active?: boolean | null
          scout_ids?: string[] | null
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          expires_at?: string | null
          joined_at?: string | null
        }
        Update: {
          id?: string
          unit_id?: string
          profile_id?: string | null
          email?: string | null
          role?: string
          status?: string
          is_active?: boolean | null
          scout_ids?: string[] | null
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          expires_at?: string | null
          joined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_memberships_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          chartered_org: string | null
          council: string | null
          created_at: string | null
          district: string | null
          id: string
          name: string
          unit_number: string
          unit_type: string
          updated_at: string | null
        }
        Insert: {
          chartered_org?: string | null
          council?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          name: string
          unit_number: string
          unit_type: string
          updated_at?: string | null
        }
        Update: {
          chartered_org?: string | null
          council?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          name?: string
          unit_number?: string
          unit_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_default_accounts: {
        Args: { p_unit_id: string }
        Returns: undefined
      }
      get_user_units: { Args: never; Returns: string[] }
      user_has_role: {
        Args: { required_roles: string[]; unit: string }
        Returns: boolean
      }
      validate_journal_entry_balance: {
        Args: { entry_id: string }
        Returns: boolean
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
