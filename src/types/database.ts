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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
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
          account_type: Database["public"]["Enums"]["account_type"]
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
          account_type?: Database["public"]["Enums"]["account_type"]
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
      adult_trainings: {
        Row: {
          completed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_current: boolean | null
          profile_id: string
          training_code: string
          training_name: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_current?: boolean | null
          profile_id: string
          training_code: string
          training_name: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_current?: boolean | null
          profile_id?: string
          training_code?: string
          training_name?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adult_trainings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adult_trainings_unit_id_fkey"
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
          is_void: boolean | null
          scout_account_id: string
          void_journal_entry_id: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          billing_record_id: string
          id?: string
          is_paid?: boolean | null
          is_void?: boolean | null
          scout_account_id: string
          void_journal_entry_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          billing_record_id?: string
          id?: string
          is_paid?: boolean | null
          is_void?: boolean | null
          scout_account_id?: string
          void_journal_entry_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          {
            foreignKeyName: "billing_charges_void_journal_entry_id_fkey"
            columns: ["void_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_charges_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          is_void: boolean | null
          journal_entry_id: string | null
          total_amount: number
          unit_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          billing_date: string
          created_at?: string | null
          created_by?: string | null
          description: string
          event_id?: string | null
          id?: string
          is_void?: boolean | null
          journal_entry_id?: string | null
          total_amount: number
          unit_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          billing_date?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_id?: string | null
          id?: string
          is_void?: boolean | null
          journal_entry_id?: string | null
          total_amount?: number
          unit_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          {
            foreignKeyName: "billing_records_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          status: Database["public"]["Enums"]["rsvp_status"]
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
          status: Database["public"]["Enums"]["rsvp_status"]
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
          status?: Database["public"]["Enums"]["rsvp_status"]
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
      extension_auth_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_revoked: boolean | null
          last_used_at: string | null
          profile_id: string
          token_hash: string
          unit_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_revoked?: boolean | null
          last_used_at?: string | null
          profile_id: string
          token_hash: string
          unit_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_revoked?: boolean | null
          last_used_at?: string | null
          profile_id?: string
          token_hash?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_auth_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_auth_tokens_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      fundraiser_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fundraiser_types_unit_id_fkey"
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
          entry_type: Database["public"]["Enums"]["journal_entry_type"] | null
          fundraiser_type_id: string | null
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
          entry_type?: Database["public"]["Enums"]["journal_entry_type"] | null
          fundraiser_type_id?: string | null
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
          entry_type?: Database["public"]["Enums"]["journal_entry_type"] | null
          fundraiser_type_id?: string | null
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
            foreignKeyName: "journal_entries_fundraiser_type_id_fkey"
            columns: ["fundraiser_type_id"]
            isOneToOne: false
            referencedRelation: "fundraiser_types"
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
          target_balance: string | null
        }
        Insert: {
          account_id: string
          credit?: number | null
          debit?: number | null
          id?: string
          journal_entry_id: string
          memo?: string | null
          scout_account_id?: string | null
          target_balance?: string | null
        }
        Update: {
          account_id?: string
          credit?: number | null
          debit?: number | null
          id?: string
          journal_entry_id?: string
          memo?: string | null
          scout_account_id?: string | null
          target_balance?: string | null
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
      patrols: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patrols_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount: number
          base_amount: number | null
          billing_charge_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          expires_at: string
          fee_amount: number | null
          fees_passed_to_payer: boolean | null
          id: string
          payment_id: string | null
          scout_account_id: string | null
          status: Database["public"]["Enums"]["payment_link_status"] | null
          token: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          base_amount?: number | null
          billing_charge_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          expires_at: string
          fee_amount?: number | null
          fees_passed_to_payer?: boolean | null
          id?: string
          payment_id?: string | null
          scout_account_id?: string | null
          status?: Database["public"]["Enums"]["payment_link_status"] | null
          token: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          base_amount?: number | null
          billing_charge_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string
          fee_amount?: number | null
          fees_passed_to_payer?: boolean | null
          id?: string
          payment_id?: string | null
          scout_account_id?: string | null
          status?: Database["public"]["Enums"]["payment_link_status"] | null
          token?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_billing_charge_id_fkey"
            columns: ["billing_charge_id"]
            isOneToOne: false
            referencedRelation: "billing_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_scout_account_id_fkey"
            columns: ["scout_account_id"]
            isOneToOne: false
            referencedRelation: "scout_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
          status: Database["public"]["Enums"]["payment_status"] | null
          unit_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
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
          status?: Database["public"]["Enums"]["payment_status"] | null
          unit_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          status?: Database["public"]["Enums"]["payment_status"] | null
          unit_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          {
            foreignKeyName: "payments_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          bsa_member_id: string | null
          created_at: string | null
          date_joined: string | null
          email: string | null
          email_secondary: string | null
          expiration_date: string | null
          first_name: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          health_form_expires: string | null
          health_form_status: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          last_synced_at: string | null
          member_type: string | null
          phone_primary: string | null
          phone_secondary: string | null
          position: string | null
          position_2: string | null
          renewal_status: string | null
          swim_class_date: string | null
          swim_classification:
            | Database["public"]["Enums"]["swim_classification"]
            | null
          sync_session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          bsa_member_id?: string | null
          created_at?: string | null
          date_joined?: string | null
          email?: string | null
          email_secondary?: string | null
          expiration_date?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          health_form_expires?: string | null
          health_form_status?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          last_synced_at?: string | null
          member_type?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          position?: string | null
          position_2?: string | null
          renewal_status?: string | null
          swim_class_date?: string | null
          swim_classification?:
            | Database["public"]["Enums"]["swim_classification"]
            | null
          sync_session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          bsa_member_id?: string | null
          created_at?: string | null
          date_joined?: string | null
          email?: string | null
          email_secondary?: string | null
          expiration_date?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          health_form_expires?: string | null
          health_form_status?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          last_synced_at?: string | null
          member_type?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          position?: string | null
          position_2?: string | null
          renewal_status?: string | null
          swim_class_date?: string | null
          swim_classification?:
            | Database["public"]["Enums"]["swim_classification"]
            | null
          sync_session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scout_accounts: {
        Row: {
          billing_balance: number | null
          created_at: string | null
          funds_balance: number
          id: string
          scout_id: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          billing_balance?: number | null
          created_at?: string | null
          funds_balance?: number
          id?: string
          scout_id: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          billing_balance?: number | null
          created_at?: string | null
          funds_balance?: number
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
      scout_activity_logs: {
        Row: {
          camping_nights: number | null
          hiking_miles: number | null
          id: string
          scout_id: string
          service_hours: number | null
          sync_session_id: string | null
          synced_at: string | null
        }
        Insert: {
          camping_nights?: number | null
          hiking_miles?: number | null
          id?: string
          scout_id: string
          service_hours?: number | null
          sync_session_id?: string | null
          synced_at?: string | null
        }
        Update: {
          camping_nights?: number | null
          hiking_miles?: number | null
          id?: string
          scout_id?: string
          service_hours?: number | null
          sync_session_id?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scout_activity_logs_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: true
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_activity_logs_sync_session_id_fkey"
            columns: ["sync_session_id"]
            isOneToOne: false
            referencedRelation: "sync_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_advancements: {
        Row: {
          advancement_data: Json | null
          bsa_member_id: string | null
          current_rank: string | null
          date_joined: string | null
          id: string
          last_rank_cub_scout: string | null
          last_rank_scouts_bsa: string | null
          membership_status: string | null
          scout_id: string
          sync_session_id: string | null
          synced_at: string | null
        }
        Insert: {
          advancement_data?: Json | null
          bsa_member_id?: string | null
          current_rank?: string | null
          date_joined?: string | null
          id?: string
          last_rank_cub_scout?: string | null
          last_rank_scouts_bsa?: string | null
          membership_status?: string | null
          scout_id: string
          sync_session_id?: string | null
          synced_at?: string | null
        }
        Update: {
          advancement_data?: Json | null
          bsa_member_id?: string | null
          current_rank?: string | null
          date_joined?: string | null
          id?: string
          last_rank_cub_scout?: string | null
          last_rank_scouts_bsa?: string | null
          membership_status?: string | null
          scout_id?: string
          sync_session_id?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scout_advancements_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: true
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_advancements_sync_session_id_fkey"
            columns: ["sync_session_id"]
            isOneToOne: false
            referencedRelation: "sync_sessions"
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
      scout_leadership_positions: {
        Row: {
          date_range: string | null
          days: number | null
          id: string
          is_current: boolean | null
          position: string
          scout_id: string
          sync_session_id: string | null
          synced_at: string | null
          unit_name: string | null
        }
        Insert: {
          date_range?: string | null
          days?: number | null
          id?: string
          is_current?: boolean | null
          position: string
          scout_id: string
          sync_session_id?: string | null
          synced_at?: string | null
          unit_name?: string | null
        }
        Update: {
          date_range?: string | null
          days?: number | null
          id?: string
          is_current?: boolean | null
          position?: string
          scout_id?: string
          sync_session_id?: string | null
          synced_at?: string | null
          unit_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scout_leadership_positions_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_leadership_positions_sync_session_id_fkey"
            columns: ["sync_session_id"]
            isOneToOne: false
            referencedRelation: "sync_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_rank_requirements: {
        Row: {
          completed_date: string | null
          id: string
          percent_complete: number | null
          rank_name: string
          requirements: Json | null
          requirements_version: string | null
          scout_id: string
          status: string
          sync_session_id: string | null
          synced_at: string | null
        }
        Insert: {
          completed_date?: string | null
          id?: string
          percent_complete?: number | null
          rank_name: string
          requirements?: Json | null
          requirements_version?: string | null
          scout_id: string
          status?: string
          sync_session_id?: string | null
          synced_at?: string | null
        }
        Update: {
          completed_date?: string | null
          id?: string
          percent_complete?: number | null
          rank_name?: string
          requirements?: Json | null
          requirements_version?: string | null
          scout_id?: string
          status?: string
          sync_session_id?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scout_rank_requirements_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_rank_requirements_sync_session_id_fkey"
            columns: ["sync_session_id"]
            isOneToOne: false
            referencedRelation: "sync_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scouts: {
        Row: {
          bsa_member_id: string | null
          created_at: string | null
          current_position: string | null
          current_position_2: string | null
          date_joined: string | null
          date_of_birth: string | null
          expiration_date: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          health_form_expires: string | null
          health_form_status: string | null
          id: string
          is_active: boolean | null
          last_name: string
          middle_name: string | null
          patrol_id: string | null
          profile_id: string | null
          rank: string | null
          renewal_status: string | null
          swim_class_date: string | null
          swim_classification:
            | Database["public"]["Enums"]["swim_classification"]
            | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          bsa_member_id?: string | null
          created_at?: string | null
          current_position?: string | null
          current_position_2?: string | null
          date_joined?: string | null
          date_of_birth?: string | null
          expiration_date?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          health_form_expires?: string | null
          health_form_status?: string | null
          id?: string
          is_active?: boolean | null
          last_name: string
          middle_name?: string | null
          patrol_id?: string | null
          profile_id?: string | null
          rank?: string | null
          renewal_status?: string | null
          swim_class_date?: string | null
          swim_classification?:
            | Database["public"]["Enums"]["swim_classification"]
            | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          bsa_member_id?: string | null
          created_at?: string | null
          current_position?: string | null
          current_position_2?: string | null
          date_joined?: string | null
          date_of_birth?: string | null
          expiration_date?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          health_form_expires?: string | null
          health_form_status?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          middle_name?: string | null
          patrol_id?: string | null
          profile_id?: string | null
          rank?: string | null
          renewal_status?: string | null
          swim_class_date?: string | null
          swim_classification?:
            | Database["public"]["Enums"]["swim_classification"]
            | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scouts_patrol_id_fkey"
            columns: ["patrol_id"]
            isOneToOne: false
            referencedRelation: "patrols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      square_transactions: {
        Row: {
          amount_money: number
          buyer_email_address: string | null
          card_brand: string | null
          cardholder_name: string | null
          created_at: string | null
          currency: string | null
          fee_money: number | null
          id: string
          is_reconciled: boolean | null
          last_4: string | null
          net_money: number
          note: string | null
          order_line_items: Json | null
          payment_id: string | null
          receipt_number: string | null
          receipt_url: string | null
          scout_account_id: string | null
          source_type: string | null
          square_created_at: string
          square_order_id: string | null
          square_payment_id: string
          status: string
          synced_at: string | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          amount_money: number
          buyer_email_address?: string | null
          card_brand?: string | null
          cardholder_name?: string | null
          created_at?: string | null
          currency?: string | null
          fee_money?: number | null
          id?: string
          is_reconciled?: boolean | null
          last_4?: string | null
          net_money: number
          note?: string | null
          order_line_items?: Json | null
          payment_id?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          scout_account_id?: string | null
          source_type?: string | null
          square_created_at: string
          square_order_id?: string | null
          square_payment_id: string
          status: string
          synced_at?: string | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          amount_money?: number
          buyer_email_address?: string | null
          card_brand?: string | null
          cardholder_name?: string | null
          created_at?: string | null
          currency?: string | null
          fee_money?: number | null
          id?: string
          is_reconciled?: boolean | null
          last_4?: string | null
          net_money?: number
          note?: string | null
          order_line_items?: Json | null
          payment_id?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          scout_account_id?: string | null
          source_type?: string | null
          square_created_at?: string
          square_order_id?: string | null
          square_payment_id?: string
          status?: string
          synced_at?: string | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "square_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "square_transactions_scout_account_id_fkey"
            columns: ["scout_account_id"]
            isOneToOne: false
            referencedRelation: "scout_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "square_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_log: Json | null
          id: string
          pages_visited: number | null
          records_extracted: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["sync_status"]
          sync_source: string | null
          unit_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_log?: Json | null
          id?: string
          pages_visited?: number | null
          records_extracted?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
          sync_source?: string | null
          unit_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_log?: Json | null
          id?: string
          pages_visited?: number | null
          records_extracted?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
          sync_source?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_sessions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_staged_members: {
        Row: {
          age: string | null
          bsa_member_id: string
          change_type: string
          changes: Json | null
          created_at: string | null
          existing_profile_id: string | null
          existing_scout_id: string | null
          expiration_date: string | null
          first_name: string
          full_name: string
          id: string
          is_selected: boolean | null
          last_name: string
          match_type: string | null
          matched_profile_id: string | null
          member_type: string
          patrol: string | null
          position: string | null
          position_2: string | null
          rank: string | null
          renewal_status: string | null
          session_id: string
          skip_reason: string | null
          status: string | null
          unit_id: string
        }
        Insert: {
          age?: string | null
          bsa_member_id: string
          change_type: string
          changes?: Json | null
          created_at?: string | null
          existing_profile_id?: string | null
          existing_scout_id?: string | null
          expiration_date?: string | null
          first_name: string
          full_name: string
          id?: string
          is_selected?: boolean | null
          last_name: string
          match_type?: string | null
          matched_profile_id?: string | null
          member_type: string
          patrol?: string | null
          position?: string | null
          position_2?: string | null
          rank?: string | null
          renewal_status?: string | null
          session_id: string
          skip_reason?: string | null
          status?: string | null
          unit_id: string
        }
        Update: {
          age?: string | null
          bsa_member_id?: string
          change_type?: string
          changes?: Json | null
          created_at?: string | null
          existing_profile_id?: string | null
          existing_scout_id?: string | null
          expiration_date?: string | null
          first_name?: string
          full_name?: string
          id?: string
          is_selected?: boolean | null
          last_name?: string
          match_type?: string | null
          matched_profile_id?: string | null
          member_type?: string
          patrol?: string | null
          position?: string | null
          position_2?: string | null
          rank?: string | null
          renewal_status?: string | null
          session_id?: string
          skip_reason?: string | null
          status?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_staged_members_existing_profile_id_fkey"
            columns: ["existing_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_staged_members_existing_scout_id_fkey"
            columns: ["existing_scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_staged_members_matched_profile_id_fkey"
            columns: ["matched_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_staged_members_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sync_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_staged_members_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_memberships: {
        Row: {
          accepted_at: string | null
          created_by: string | null
          current_position: string | null
          email: string | null
          id: string
          invite_expires_at: string | null
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          linked_scout_id: string | null
          profile_id: string | null
          role: Database["public"]["Enums"]["membership_role"]
          section_unit_id: string | null
          status: Database["public"]["Enums"]["membership_status"] | null
          unit_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_by?: string | null
          current_position?: string | null
          email?: string | null
          id?: string
          invite_expires_at?: string | null
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          linked_scout_id?: string | null
          profile_id?: string | null
          role: Database["public"]["Enums"]["membership_role"]
          section_unit_id?: string | null
          status?: Database["public"]["Enums"]["membership_status"] | null
          unit_id: string
        }
        Update: {
          accepted_at?: string | null
          created_by?: string | null
          current_position?: string | null
          email?: string | null
          id?: string
          invite_expires_at?: string | null
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          linked_scout_id?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          section_unit_id?: string | null
          status?: Database["public"]["Enums"]["membership_status"] | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_memberships_linked_scout_id_fkey"
            columns: ["linked_scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_memberships_section_unit_id_fkey"
            columns: ["section_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_memberships_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_square_credentials: {
        Row: {
          access_token_encrypted: string
          connected_at: string | null
          created_at: string | null
          environment: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          location_id: string | null
          merchant_id: string
          refresh_token_encrypted: string
          token_expires_at: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          access_token_encrypted: string
          connected_at?: string | null
          created_at?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          location_id?: string | null
          merchant_id: string
          refresh_token_encrypted: string
          token_expires_at: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          access_token_encrypted?: string
          connected_at?: string | null
          created_at?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          location_id?: string | null
          merchant_id?: string
          refresh_token_encrypted?: string
          token_expires_at?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_square_credentials_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
            referencedRelation: "units"
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
          is_section: boolean | null
          logo_url: string | null
          name: string
          parent_unit_id: string | null
          pass_fees_to_payer: boolean | null
          processing_fee_fixed: number | null
          processing_fee_percent: number | null
          unit_gender: Database["public"]["Enums"]["unit_gender"] | null
          unit_number: string
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at: string | null
        }
        Insert: {
          chartered_org?: string | null
          council?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          is_section?: boolean | null
          logo_url?: string | null
          name: string
          parent_unit_id?: string | null
          pass_fees_to_payer?: boolean | null
          processing_fee_fixed?: number | null
          processing_fee_percent?: number | null
          unit_gender?: Database["public"]["Enums"]["unit_gender"] | null
          unit_number: string
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at?: string | null
        }
        Update: {
          chartered_org?: string | null
          council?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          is_section?: boolean | null
          logo_url?: string | null
          name?: string
          parent_unit_id?: string | null
          pass_fees_to_payer?: boolean | null
          processing_fee_fixed?: number | null
          processing_fee_percent?: number | null
          unit_gender?: Database["public"]["Enums"]["unit_gender"] | null
          unit_number?: string
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_parent_unit_id_fkey"
            columns: ["parent_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          additional_info: string | null
          biggest_pain_point: string | null
          created_at: string
          current_payment_platform: string | null
          current_software: string | null
          email: string
          id: string
          ip_address: string | null
          name: string | null
          referral_source: string | null
          unit_size: string | null
          unit_type: string | null
          user_agent: string | null
        }
        Insert: {
          additional_info?: string | null
          biggest_pain_point?: string | null
          created_at?: string
          current_payment_platform?: string | null
          current_software?: string | null
          email: string
          id?: string
          ip_address?: string | null
          name?: string | null
          referral_source?: string | null
          unit_size?: string | null
          unit_type?: string | null
          user_agent?: string | null
        }
        Update: {
          additional_info?: string | null
          biggest_pain_point?: string | null
          created_at?: string
          current_payment_platform?: string | null
          current_software?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          name?: string | null
          referral_source?: string | null
          unit_size?: string | null
          unit_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_transfer_overpayment: {
        Args: { p_amount: number; p_scout_account_id: string }
        Returns: undefined
      }
      create_billing_with_journal: {
        Args: {
          p_billing_date: string
          p_billing_type: string
          p_description: string
          p_per_scout_amount: number
          p_scout_accounts: Json
          p_total_amount: number
          p_unit_id: string
        }
        Returns: Json
      }
      create_default_accounts: {
        Args: { p_unit_id: string }
        Returns: undefined
      }
      create_refund_journal_entry: {
        Args: {
          p_original_square_payment_id: string
          p_refund_amount_cents: number
          p_refund_reason?: string
          p_scout_account_id: string
          p_square_refund_id: string
          p_unit_id: string
        }
        Returns: Json
      }
      create_unit_sections: {
        Args: {
          p_boys_number?: string
          p_girls_number?: string
          p_parent_unit_id: string
        }
        Returns: {
          boys_section_id: string
          girls_section_id: string
        }[]
      }
      credit_fundraising_to_scout: {
        Args: {
          p_amount: number
          p_description: string
          p_fundraiser_type?: string
          p_scout_account_id: string
        }
        Returns: Json
      }
      get_auth_user_email: { Args: never; Returns: string }
      get_current_profile_id: { Args: never; Returns: string }
      get_parent_unit: { Args: { p_unit_id: string }; Returns: string }
      get_unit_sections: { Args: { p_unit_id: string }; Returns: string[] }
      get_user_active_unit_ids: { Args: never; Returns: string[] }
      process_payment_link_payment: {
        Args: {
          p_base_amount_cents: number
          p_buyer_email?: string
          p_card_details: Json
          p_fee_amount_cents: number
          p_fees_passed_to_payer: boolean
          p_net_amount_cents: number
          p_payment_link_id: string
          p_payment_note?: string
          p_scout_account_id: string
          p_scout_name: string
          p_square_order_id: string
          p_square_payment_id: string
          p_square_receipt_url: string
          p_total_amount_cents: number
        }
        Returns: Json
      }
      transfer_funds_to_billing: {
        Args: {
          p_amount: number
          p_description?: string
          p_scout_account_id: string
        }
        Returns: Json
      }
      update_billing_description: {
        Args: { p_billing_record_id: string; p_new_description: string }
        Returns: Json
      }
      user_has_role: {
        Args: {
          required_roles: Database["public"]["Enums"]["membership_role"][]
          unit: string
        }
        Returns: boolean
      }
      user_is_unit_admin: { Args: { check_unit_id: string }; Returns: boolean }
      validate_journal_entry_balance: {
        Args: { entry_id: string }
        Returns: boolean
      }
      void_billing_charge: {
        Args: { p_billing_charge_id: string; p_void_reason: string }
        Returns: Json
      }
      void_billing_record: {
        Args: { p_billing_record_id: string; p_void_reason: string }
        Returns: Json
      }
      void_payment: {
        Args: { p_payment_id: string; p_reason: string; p_voided_by: string }
        Returns: Json
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "income" | "expense"
      gender: "male" | "female" | "other" | "prefer_not_to_say"
      journal_entry_type:
        | "billing"
        | "payment"
        | "refund"
        | "reversal"
        | "adjustment"
        | "funds_transfer"
        | "fundraising_credit"
      membership_role: "admin" | "treasurer" | "leader" | "parent" | "scout"
      membership_status: "roster" | "invited" | "active" | "inactive"
      payment_link_status: "pending" | "completed" | "expired" | "cancelled"
      payment_status: "pending" | "completed" | "voided" | "refunded"
      rsvp_status: "going" | "not_going" | "maybe"
      swim_classification: "swimmer" | "beginner" | "non-swimmer"
      sync_status: "running" | "staged" | "completed" | "failed" | "cancelled"
      unit_gender: "boys" | "girls" | "coed"
      unit_type: "troop" | "pack" | "crew" | "ship"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["asset", "liability", "equity", "income", "expense"],
      gender: ["male", "female", "other", "prefer_not_to_say"],
      journal_entry_type: [
        "billing",
        "payment",
        "refund",
        "reversal",
        "adjustment",
        "funds_transfer",
        "fundraising_credit",
      ],
      membership_role: ["admin", "treasurer", "leader", "parent", "scout"],
      membership_status: ["roster", "invited", "active", "inactive"],
      payment_link_status: ["pending", "completed", "expired", "cancelled"],
      payment_status: ["pending", "completed", "voided", "refunded"],
      rsvp_status: ["going", "not_going", "maybe"],
      swim_classification: ["swimmer", "beginner", "non-swimmer"],
      sync_status: ["running", "staged", "completed", "failed", "cancelled"],
      unit_gender: ["boys", "girls", "coed"],
      unit_type: ["troop", "pack", "crew", "ship"],
    },
  },
} as const
