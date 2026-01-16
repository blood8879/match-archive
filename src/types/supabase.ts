export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// 알림 타입
export type NotificationType =
  | "team_invite"
  | "merge_request"
  | "invite_accepted"
  | "invite_rejected"
  | "merge_accepted"
  | "merge_rejected"
  | "team_joined"
  | "match_created"
  | "match_reminder"
  | "join_request"
  | "join_accepted"
  | "join_rejected";

// 뱃지 타입
export type BadgeType =
  | "first_goal"
  | "first_assist"
  | "first_mom"
  | "streak_5"
  | "streak_10"
  | "streak_20"
  | "team_founder"
  | "multi_team_5"
  | "veteran_1year"
  | "veteran_2year"
  | "matches_10"
  | "matches_50"
  | "matches_100"
  | "goals_10"
  | "goals_50"
  | "assists_10"
  | "assists_50";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          nickname: string | null;
          position: "FW" | "MF" | "DF" | "GK" | null;
          avatar_url: string | null;
          user_code: string | null;
          phone: string | null;
          preferred_position: string | null;
          bio: string | null;
          is_public: boolean;
          email_notifications: boolean;
          birth_date: string | null;
          nationality: string | null;
          preferred_foot: "left" | "right" | "both" | null;
          preferred_times: string[] | null;
          soccer_experience: string | null;
          play_style_tags: string[] | null;
          primary_team_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          nickname?: string | null;
          position?: "FW" | "MF" | "DF" | "GK" | null;
          avatar_url?: string | null;
          user_code?: string | null;
          phone?: string | null;
          preferred_position?: string | null;
          bio?: string | null;
          is_public?: boolean;
          email_notifications?: boolean;
          birth_date?: string | null;
          nationality?: string | null;
          preferred_foot?: "left" | "right" | "both" | null;
          preferred_times?: string[] | null;
          soccer_experience?: string | null;
          play_style_tags?: string[] | null;
          primary_team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          nickname?: string | null;
          position?: "FW" | "MF" | "DF" | "GK" | null;
          avatar_url?: string | null;
          user_code?: string | null;
          phone?: string | null;
          preferred_position?: string | null;
          bio?: string | null;
          is_public?: boolean;
          email_notifications?: boolean;
          birth_date?: string | null;
          nationality?: string | null;
          preferred_foot?: "left" | "right" | "both" | null;
          preferred_times?: string[] | null;
          soccer_experience?: string | null;
          play_style_tags?: string[] | null;
          primary_team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          emblem_url: string | null;
          region: string | null;
          owner_id: string;
          code: string;
          member_count: number;
          hashtags: string[];
          description: string | null;
          activity_time: string | null;
          activity_days: string[];
          is_recruiting: boolean;
          recruiting_positions: { FW?: number; MF?: number; DF?: number; GK?: number } | null;
          level: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          emblem_url?: string | null;
          region?: string | null;
          owner_id: string;
          code: string;
          member_count?: number;
          hashtags?: string[];
          description?: string | null;
          activity_time?: string | null;
          activity_days?: string[];
          is_recruiting?: boolean;
          recruiting_positions?: { FW?: number; MF?: number; DF?: number; GK?: number } | null;
          level?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          emblem_url?: string | null;
          region?: string | null;
          owner_id?: string;
          code?: string;
          member_count?: number;
          hashtags?: string[];
          description?: string | null;
          activity_time?: string | null;
          activity_days?: string[];
          is_recruiting?: boolean;
          recruiting_positions?: { FW?: number; MF?: number; DF?: number; GK?: number } | null;
          level?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string | null;
          role: "OWNER" | "MANAGER" | "MEMBER";
          status: "active" | "pending" | "merged";
          is_guest: boolean;
          guest_name: string | null;
          back_number: number | null;
          team_positions: string[];
          joined_at: string;
          merged_to: string | null;
          merged_at: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id?: string | null;
          role?: "OWNER" | "MANAGER" | "MEMBER";
          status?: "active" | "pending" | "merged";
          is_guest?: boolean;
          guest_name?: string | null;
          back_number?: number | null;
          team_positions?: string[];
          joined_at?: string;
          merged_to?: string | null;
          merged_at?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string | null;
          role?: "OWNER" | "MANAGER" | "MEMBER";
          status?: "active" | "pending" | "merged";
          is_guest?: boolean;
          guest_name?: string | null;
          back_number?: number | null;
          team_positions?: string[];
          joined_at?: string;
          merged_to?: string | null;
          merged_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      matches: {
        Row: {
          id: string;
          team_id: string;
          opponent_name: string;
          opponent_team_id: string | null;
          guest_team_id: string | null;
          is_guest_opponent: boolean;
          match_date: string;
          location: string | null;
          venue_id: string | null;
          status: "SCHEDULED" | "FINISHED" | "CANCELED";
          quarters: number;
          home_score: number;
          away_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          opponent_name: string;
          opponent_team_id?: string | null;
          guest_team_id?: string | null;
          is_guest_opponent?: boolean;
          match_date: string;
          location?: string | null;
          venue_id?: string | null;
          status?: "SCHEDULED" | "FINISHED" | "CANCELED";
          quarters?: number;
          home_score?: number;
          away_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          opponent_name?: string;
          opponent_team_id?: string | null;
          guest_team_id?: string | null;
          is_guest_opponent?: boolean;
          match_date?: string;
          location?: string | null;
          venue_id?: string | null;
          status?: "SCHEDULED" | "FINISHED" | "CANCELED";
          quarters?: number;
          home_score?: number;
          away_score?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_team_id_fkey";
            columns: ["team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_opponent_team_id_fkey";
            columns: ["opponent_team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_guest_team_id_fkey";
            columns: ["guest_team_id"];
            referencedRelation: "guest_teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_venue_id_fkey";
            columns: ["venue_id"];
            referencedRelation: "venues";
            referencedColumns: ["id"];
          }
        ];
      };
      match_records: {
        Row: {
          id: string;
          match_id: string;
          team_member_id: string;
          quarters_played: number;
          goals: number;
          assists: number;
          is_mom: boolean;
          clean_sheet: boolean;
          position_played: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          team_member_id: string;
          quarters_played?: number;
          goals?: number;
          assists?: number;
          is_mom?: boolean;
          clean_sheet?: boolean;
          position_played?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          team_member_id?: string;
          quarters_played?: number;
          goals?: number;
          assists?: number;
          is_mom?: boolean;
          clean_sheet?: boolean;
          position_played?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_records_match_id_fkey";
            columns: ["match_id"];
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_records_team_member_id_fkey";
            columns: ["team_member_id"];
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          }
        ];
      };
      opponent_players: {
        Row: {
          id: string;
          match_id: string;
          name: string;
          number: number | null;
          position: "FW" | "MF" | "DF" | "GK" | null;
          is_playing: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          name: string;
          number?: number | null;
          position?: "FW" | "MF" | "DF" | "GK" | null;
          is_playing?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          name?: string;
          number?: number | null;
          position?: "FW" | "MF" | "DF" | "GK" | null;
          is_playing?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opponent_players_match_id_fkey";
            columns: ["match_id"];
            referencedRelation: "matches";
            referencedColumns: ["id"];
          }
        ];
      };
      goals: {
        Row: {
          id: string;
          match_id: string;
          team_member_id: string | null;
          assist_member_id: string | null;
          assist_opponent_id: string | null;
          opponent_player_id: string | null;
          scoring_team: "HOME" | "AWAY";
          quarter: number;
          type: "NORMAL" | "PK" | "FREEKICK" | "OWN_GOAL";
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          team_member_id?: string | null;
          assist_member_id?: string | null;
          assist_opponent_id?: string | null;
          opponent_player_id?: string | null;
          scoring_team?: "HOME" | "AWAY";
          quarter: number;
          type?: "NORMAL" | "PK" | "FREEKICK" | "OWN_GOAL";
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          team_member_id?: string | null;
          assist_member_id?: string | null;
          assist_opponent_id?: string | null;
          opponent_player_id?: string | null;
          scoring_team?: "HOME" | "AWAY";
          quarter?: number;
          type?: "NORMAL" | "PK" | "FREEKICK" | "OWN_GOAL";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_match_id_fkey";
            columns: ["match_id"];
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goals_team_member_id_fkey";
            columns: ["team_member_id"];
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goals_assist_member_id_fkey";
            columns: ["assist_member_id"];
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          }
        ];
      };
      match_attendance: {
        Row: {
          id: string;
          match_id: string;
          team_member_id: string;
          status: "attending" | "maybe" | "absent";
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          team_member_id: string;
          status?: "attending" | "maybe" | "absent";
          updated_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          team_member_id?: string;
          status?: "attending" | "maybe" | "absent";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_attendance_match_id_fkey";
            columns: ["match_id"];
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_attendance_team_member_id_fkey";
            columns: ["team_member_id"];
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          }
        ];
      };
      venues: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          address: string;
          address_detail: string | null;
          postal_code: string | null;
          latitude: number | null;
          longitude: number | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          address: string;
          address_detail?: string | null;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          address?: string;
          address_detail?: string | null;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "venues_team_id_fkey";
            columns: ["team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      team_invites: {
        Row: {
          id: string;
          team_id: string;
          inviter_id: string;
          invitee_id: string;
          status: "pending" | "accepted" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          inviter_id: string;
          invitee_id: string;
          status?: "pending" | "accepted" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          inviter_id?: string;
          invitee_id?: string;
          status?: "pending" | "accepted" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey";
            columns: ["team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invites_inviter_id_fkey";
            columns: ["inviter_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invites_invitee_id_fkey";
            columns: ["invitee_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      guest_teams: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          region: string | null;
          emblem_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          region?: string | null;
          emblem_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          region?: string | null;
          emblem_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guest_teams_team_id_fkey";
            columns: ["team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      record_merge_requests: {
        Row: {
          id: string;
          team_id: string;
          guest_member_id: string;
          inviter_id: string;
          invitee_id: string;
          status: "pending" | "accepted" | "rejected" | "cancelled";
          created_at: string;
          updated_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          guest_member_id: string;
          inviter_id: string;
          invitee_id: string;
          status?: "pending" | "accepted" | "rejected" | "cancelled";
          created_at?: string;
          updated_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          guest_member_id?: string;
          inviter_id?: string;
          invitee_id?: string;
          status?: "pending" | "accepted" | "rejected" | "cancelled";
          created_at?: string;
          updated_at?: string;
          processed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "record_merge_requests_team_id_fkey";
            columns: ["team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "record_merge_requests_guest_member_id_fkey";
            columns: ["guest_member_id"];
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "record_merge_requests_inviter_id_fkey";
            columns: ["inviter_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "record_merge_requests_invitee_id_fkey";
            columns: ["invitee_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          is_read: boolean;
          related_team_id: string | null;
          related_invite_id: string | null;
          related_merge_request_id: string | null;
          related_match_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          is_read?: boolean;
          related_team_id?: string | null;
          related_invite_id?: string | null;
          related_merge_request_id?: string | null;
          related_match_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          message?: string;
          is_read?: boolean;
          related_team_id?: string | null;
          related_invite_id?: string | null;
          related_merge_request_id?: string | null;
          related_match_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_related_team_id_fkey";
            columns: ["related_team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_related_invite_id_fkey";
            columns: ["related_invite_id"];
            referencedRelation: "team_invites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_related_merge_request_id_fkey";
            columns: ["related_merge_request_id"];
            referencedRelation: "record_merge_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_related_match_id_fkey";
            columns: ["related_match_id"];
            referencedRelation: "matches";
            referencedColumns: ["id"];
          }
        ];
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_type: BadgeType;
          earned_at: string;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_type: BadgeType;
          earned_at?: string;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_type?: BadgeType;
          earned_at?: string;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_team_with_owner: {
        Args: {
          p_name: string;
          p_region?: string | null;
          p_code?: string | null;
        };
        Returns: Database["public"]["Tables"]["teams"]["Row"];
      };
      process_record_merge: {
        Args: {
          p_merge_request_id: string;
          p_user_id: string;
        };
        Returns: {
          success: boolean;
          new_member_id?: string;
          records_updated?: number;
          goals_updated?: number;
          assists_updated?: number;
          error?: string;
        };
      };
    };
    Enums: {
      position: "FW" | "MF" | "DF" | "GK";
      member_role: "OWNER" | "MANAGER" | "MEMBER";
      member_status: "active" | "pending" | "merged";
      match_status: "SCHEDULED" | "FINISHED" | "CANCELED";
      goal_type: "NORMAL" | "PK" | "FREEKICK" | "OWN_GOAL";
      attendance_status: "attending" | "maybe" | "absent";
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type User = Tables<"users">;
export type Team = Tables<"teams">;
export type TeamMember = Tables<"team_members">;
export type Match = Tables<"matches">;
export type MatchRecord = Tables<"match_records">;
export type Goal = Tables<"goals">;
export type MatchAttendance = Tables<"match_attendance">;
export type TeamInvite = Tables<"team_invites">;
export type Venue = Tables<"venues">;
export type GuestTeam = Tables<"guest_teams">;
export type OpponentPlayer = Tables<"opponent_players">;
export type RecordMergeRequest = Tables<"record_merge_requests">;
export type Notification = Tables<"notifications">;
export type UserBadge = Tables<"user_badges">;

// 기록 병합 요청 with 관계 데이터
export type RecordMergeRequestWithDetails = RecordMergeRequest & {
  team: Pick<Team, "id" | "name" | "emblem_url">;
  guest_member: Pick<TeamMember, "id" | "guest_name" | "is_guest">;
  inviter: Pick<User, "id" | "nickname" | "avatar_url">;
  invitee: Pick<User, "id" | "nickname" | "avatar_url">;
};

// 용병 기록 with 통계 정보
export type GuestMemberWithStats = TeamMember & {
  total_matches: number;
  total_goals: number;
  total_assists: number;
};

// 알림 with 관계 데이터
export type NotificationWithDetails = Notification & {
  team?: Pick<Team, "id" | "name" | "emblem_url"> | null;
};
