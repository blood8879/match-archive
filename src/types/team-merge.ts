/**
 * 팀 병합(기록 통합) 관련 타입 정의
 */

import type { Match, Team, GuestTeam, User } from "./supabase";

// =====================================================
// 기본 테이블 타입
// =====================================================

export type TeamMergeRequestStatus =
  | "pending"
  | "dispute"
  | "approved"
  | "rejected"
  | "cancelled";

export type MergeMappingType =
  | "create_new"
  | "link_existing"
  | "skip"
  | "dispute";

export type MergeMappingStatus =
  | "pending"
  | "dispute"
  | "processed"
  | "skipped";

export type DisputeStatus = "pending" | "resolved" | "cancelled";

export interface TeamMergeRequest {
  id: string;
  requester_team_id: string;
  requester_user_id: string;
  guest_team_id: string | null;
  target_team_id: string;
  approver_user_id: string | null;
  status: TeamMergeRequestStatus;
  matches_created: number;
  matches_linked: number;
  created_at: string;
  processed_at: string | null;
}

export interface TeamMergeMatchMapping {
  id: string;
  merge_request_id: string;
  source_match_id: string;
  source_team_id: string;
  mapping_type: MergeMappingType;
  existing_match_id: string | null;
  created_match_id: string | null;
  status: MergeMappingStatus;
  created_at: string;
}

export interface TeamMergeDispute {
  id: string;
  mapping_id: string;
  requester_home_score: number;
  requester_away_score: number;
  target_home_score: number | null;
  target_away_score: number | null;
  requester_submitted_home: number | null;
  requester_submitted_away: number | null;
  requester_submitted_at: string | null;
  requester_submitted_by: string | null;
  target_submitted_home: number | null;
  target_submitted_away: number | null;
  target_submitted_at: string | null;
  target_submitted_by: string | null;
  status: DisputeStatus;
  resolved_home_score: number | null;
  resolved_away_score: number | null;
  resolved_at: string | null;
  created_at: string;
}

// =====================================================
// 조인된 타입 (With Relations)
// =====================================================

export interface TeamMergeRequestWithDetails extends TeamMergeRequest {
  requester_team: Pick<Team, "id" | "name" | "emblem_url">;
  target_team: Pick<Team, "id" | "name" | "emblem_url">;
  guest_team?: Pick<GuestTeam, "id" | "name"> | null;
  requester_user: Pick<User, "id" | "nickname" | "avatar_url">;
  approver_user?: Pick<User, "id" | "nickname" | "avatar_url"> | null;
  mappings_count?: number;
  disputes_count?: number;
}

export interface TeamMergeMappingWithDetails extends TeamMergeMatchMapping {
  source_match: Match;
  existing_match?: Match | null;
  created_match?: Match | null;
  dispute?: TeamMergeDispute | null;
}

export interface TeamMergeDisputeWithDetails extends TeamMergeDispute {
  mapping: TeamMergeMappingWithDetails;
  requester_submitted_user?: Pick<User, "id" | "nickname"> | null;
  target_submitted_user?: Pick<User, "id" | "nickname"> | null;
}

// =====================================================
// 검색 및 매칭 관련 타입
// =====================================================

export type MatchConflictType =
  | "no_conflict" // 상대팀에 해당 경기 없음 → 새로 생성
  | "score_match" // 점수 일치 → 기존 연결
  | "score_mismatch" // 점수 불일치 → 분쟁 조정 필요
  | "already_merged"; // 이미 병합됨 → 제외

export interface MatchSearchResult {
  match: Match;
  source_team: "requester" | "target";
  conflict_type: MatchConflictType;
  conflicting_match?: Match | null;
  is_home: boolean;
}

export interface TeamSearchResult {
  team: Pick<Team, "id" | "name" | "emblem_url" | "code" | "region">;
  related_matches: MatchSearchResult[];
  total_matches: number;
  conflicting_matches: number;
  already_merged_matches: number;
}

// =====================================================
// API 응답 타입
// =====================================================

export interface CreateMergeRequestInput {
  target_team_id: string;
  guest_team_id?: string;
  mappings: Array<{
    source_match_id: string;
    source_team_id: string;
    mapping_type: MergeMappingType;
    existing_match_id?: string;
  }>;
}

export interface SubmitDisputeScoreResult {
  success: boolean;
  resolved?: boolean;
  final_score?: string;
  submitted_by?: "requester" | "target";
  waiting_for?: "requester_team" | "target_team" | "score_mismatch";
  error?: string;
}

export interface ProcessTeamMergeResult {
  success: boolean;
  matches_created?: number;
  matches_linked?: number;
  error?: string;
}

// =====================================================
// 알림 타입 확장
// =====================================================

export type TeamMergeNotificationType =
  | "team_merge_request" // 병합 요청 받음
  | "team_merge_dispute" // 점수 불일치 발생
  | "team_merge_score_submit" // 상대팀이 점수 제출
  | "team_merge_resolved" // 점수 조정 완료
  | "team_merge_approved" // 병합 승인됨
  | "team_merge_rejected"; // 병합 거절됨

// =====================================================
// UI 상태 타입
// =====================================================

export interface MappingSelectionState {
  [matchId: string]: {
    type: MergeMappingType;
    existing_match_id?: string;
    submitted_score?: {
      home: number;
      away: number;
    };
  };
}

export interface MergeRequestFormState {
  targetTeamId: string | null;
  targetTeamCode: string;
  searchResults: TeamSearchResult | null;
  mappingSelections: MappingSelectionState;
  isLoading: boolean;
  error: string | null;
}
