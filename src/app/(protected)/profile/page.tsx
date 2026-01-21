import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Target,
  Users,
  Shield,
  Star,
  TrendingUp,
  Calendar,
  ChevronRight,
  Settings,
  Clock,
  Award,
  Briefcase,
  MapPin,
} from "lucide-react";
import type { User, TeamMember, Team, Match, MatchRecord, UserBadge } from "@/types/supabase";
import { PlayerCodeBadge } from "./player-code-badge";
import { BADGE_DEFINITIONS } from "@/lib/badge-definitions";

type TeamMemberWithTeam = TeamMember & { team: Team | null };
type MatchRecordWithMatch = MatchRecord & { match: Match & { team: Team | null } | null };

function getPositionLabel(pos: string | null) {
  const positions: Record<string, string> = {
    FW: "공격수",
    MF: "미드필더",
    DF: "수비수",
    GK: "골키퍼",
  };
  return pos ? positions[pos] || pos : "미지정";
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const typedProfile = profile as User | null;

  const { data: myTeamsRaw } = await supabase
    .from("team_members")
    .select("*, team:teams(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("joined_at", { ascending: false });

  const myTeams = myTeamsRaw as TeamMemberWithTeam[] | null;
  const firstTeam = myTeams?.[0]?.team;

  // 뱃지 조회
  const { data: badgesRaw } = await supabase
    .from("user_badges")
    .select("*")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });

  const badges = (badgesRaw || []) as UserBadge[];

  const memberIds = myTeams?.map((t) => t.id) ?? [];
  let totalGoals = 0;
  let totalAssists = 0;
  let matchesPlayed = 0;
  let totalMom = 0;
  let totalCleanSheets = 0;
  let recentMatches: MatchRecordWithMatch[] = [];

  if (memberIds.length > 0) {
    const { data: myRecords } = await supabase
      .from("match_records")
      .select("*, match:matches(*, team:teams!matches_team_id_fkey(*))")
      .in("team_member_id", memberIds)
      .order("created_at", { ascending: false })
      .limit(20);

    if (myRecords) {
      const typedRecords = myRecords as MatchRecordWithMatch[];
      // FINISHED 상태의 경기만 필터링
      const finishedRecords = typedRecords.filter((r) => r.match?.status === "FINISHED");

      totalGoals = finishedRecords.reduce((sum, r) => sum + r.goals, 0);
      totalAssists = finishedRecords.reduce((sum, r) => sum + r.assists, 0);
      totalMom = finishedRecords.filter((r) => r.is_mom).length;
      totalCleanSheets = finishedRecords.filter((r) => r.clean_sheet).length;
      matchesPlayed = finishedRecords.length;
      recentMatches = finishedRecords.slice(0, 5);
    }
  }

  // 포지션별 출전 횟수 계산
  const positionCounts: Record<string, number> = {};
  if (memberIds.length > 0) {
    const { data: allRecords } = await supabase
      .from("match_records")
      .select("position_played, match:matches!inner(status)")
      .in("team_member_id", memberIds);

    if (allRecords) {
      allRecords.forEach((record: any) => {
        if (record.match?.status === "FINISHED" && record.position_played) {
          positionCounts[record.position_played] = (positionCounts[record.position_played] || 0) + 1;
        }
      });
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00e677]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#214a36]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* 프로필 헤더 */}
        <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-center md:items-start">
            <div className="relative">
              <div className="size-20 sm:size-28 md:size-32 rounded-full bg-gradient-to-br from-[#214a36] to-[#0f2319] p-1 shadow-2xl ring-2 ring-white/10 overflow-hidden">
                {typedProfile?.avatar_url ? (
                  <img
                    src={typedProfile.avatar_url}
                    alt={typedProfile.nickname || "User"}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#1a4031] flex items-center justify-center">
                    <span className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#00e677]">
                      {typedProfile?.nickname?.charAt(0) || "U"}
                    </span>
                  </div>
                )}
              </div>
              {badges.length > 0 && (
                <div className="absolute -bottom-1 -right-1 bg-[#00e677]/20 text-[#00e677] text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border-2 border-[#10231a]">
                  {badges.length}개 뱃지
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left min-w-0">
              <div className="flex flex-col md:flex-row md:items-center gap-1.5 sm:gap-2 md:gap-4 mb-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight truncate">
                  {typedProfile?.nickname || "사용자"}
                </h1>
                {typedProfile?.position && (
                  <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-xs sm:text-sm font-bold w-fit mx-auto md:mx-0 ${
                    typedProfile.position === "FW" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                    typedProfile.position === "MF" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                    typedProfile.position === "DF" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                    "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  }`}>
                    {typedProfile.position} · {getPositionLabel(typedProfile.position)}
                  </span>
                )}
              </div>

              <div className="flex flex-col md:flex-row items-center gap-1.5 sm:gap-2 md:gap-4 text-[#8eccae] text-xs sm:text-sm md:text-base mb-3 sm:mb-4">
                {firstTeam ? (
                  <span className="flex items-center gap-1 sm:gap-1.5">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="truncate max-w-[150px] sm:max-w-none">{firstTeam.name}</span>
                    {myTeams && myTeams.length > 1 && (
                      <span className="text-white/50">외 {myTeams.length - 1}팀</span>
                    )}
                  </span>
                ) : (
                  <span>소속 팀 없음</span>
                )}
                {typedProfile?.user_code && (
                  <PlayerCodeBadge code={typedProfile.user_code} />
                )}
              </div>

              {/* 자기소개 */}
              <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto md:mx-0 mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-none">
                {typedProfile?.bio || "자기소개가 없습니다. 프로필을 편집하여 자기소개를 추가해보세요."}
              </p>

              <div className="flex gap-2 sm:gap-3 justify-center md:justify-start">
                <Link
                  href="/settings"
                  className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-[#00e677] hover:bg-[#00e677]/90 text-[#0f2319] font-bold text-xs sm:text-sm transition-all shadow-[0_0_15px_rgba(6,224,118,0.2)]"
                >
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  프로필 편집
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 통계 카드 */}
        <section className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
          <StatCard icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5" />} label="경기 수" value={matchesPlayed} />
          <StatCard icon={<Target className="w-4 h-4 sm:w-5 sm:h-5" />} label="골" value={totalGoals} highlight />
          <StatCard icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />} label="어시스트" value={totalAssists} />
          <StatCard icon={<Star className="w-4 h-4 sm:w-5 sm:h-5" />} label="MOM" value={totalMom} className="hidden sm:block" />
          <StatCard icon={<Shield className="w-4 h-4 sm:w-5 sm:h-5" />} label="클린시트" value={totalCleanSheets} className="hidden sm:block" />
        </section>
        {/* Mobile only: MOM & 클린시트 */}
        <section className="grid grid-cols-2 gap-2 sm:hidden">
          <StatCard icon={<Star className="w-4 h-4" />} label="MOM" value={totalMom} />
          <StatCard icon={<Shield className="w-4 h-4" />} label="클린시트" value={totalCleanSheets} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <section className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-[#00e677]" />
                프로필 정보
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {typedProfile?.soccer_experience && (
                  <div className="space-y-1.5 sm:space-y-2">
                    <p className="text-xs sm:text-sm text-[#8eccae]">축구 경력</p>
                    <p className="text-white text-sm sm:text-base">{typedProfile.soccer_experience}</p>
                  </div>
                )}

                {typedProfile?.preferred_times && typedProfile.preferred_times.length > 0 && (
                  <div className="space-y-1.5 sm:space-y-2">
                    <p className="text-xs sm:text-sm text-[#8eccae] flex items-center gap-1 sm:gap-1.5">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      선호 시간대
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {typedProfile.preferred_times.map((time, idx) => (
                        <span key={idx} className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/5 text-white text-xs sm:text-sm border border-white/10">
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(positionCounts).length > 0 && (
                  <div className="space-y-1.5 sm:space-y-2 md:col-span-2">
                    <p className="text-xs sm:text-sm text-[#8eccae] flex items-center gap-1 sm:gap-1.5">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      포지션별 출전
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {Object.entries(positionCounts)
                        .sort(([, a], [, b]) => b - a)
                        .map(([pos, count]) => (
                          <span
                            key={pos}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium border ${
                              pos === "FW" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                              pos === "MF" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                              pos === "DF" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                              "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            }`}
                          >
                            {pos} · {count}경기
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {typedProfile?.play_style_tags && typedProfile.play_style_tags.length > 0 && (
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/5">
                  <p className="text-xs sm:text-sm text-[#8eccae] mb-2 sm:mb-3">플레이 스타일</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {typedProfile.play_style_tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#00e677]/10 text-[#00e677] text-xs sm:text-sm font-medium border border-[#00e677]/20"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#00e677]" />
                획득한 뱃지
                <span className="text-xs sm:text-sm font-normal text-white/50">({badges.length}개)</span>
              </h3>

              {badges.length > 0 ? (
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  {badges.map((badge) => {
                    const info = BADGE_DEFINITIONS[badge.badge_type];
                    return (
                      <div
                        key={badge.id}
                        className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border ${info.color}`}
                      >
                        <span className="text-xl sm:text-2xl">{info.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs sm:text-sm truncate">{info.name}</p>
                          <p className="text-[10px] sm:text-xs opacity-70 truncate">{info.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 sm:py-8 text-center">
                  <p className="text-gray-500 text-xs sm:text-sm">아직 획득한 뱃지가 없습니다</p>
                  <p className="text-gray-600 text-[10px] sm:text-xs mt-1">경기에 참여하고 기록을 쌓아 뱃지를 획득하세요!</p>
                </div>
              )}
            </div>
          </section>

          <div className="space-y-4 sm:space-y-6">
            <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#00e677]" />
                팀 활동
              </h3>

              {myTeams && myTeams.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {myTeams.slice(0, 5).map((membership) => {
                    const team = membership.team;
                    if (!team) return null;

                    return (
                      <Link
                        key={membership.id}
                        href={`/teams/${team.id}`}
                        className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-black/20 hover:bg-black/30 transition-colors group"
                      >
                        <div className="size-8 sm:size-10 rounded-lg bg-[#1a4031] flex items-center justify-center overflow-hidden shrink-0">
                          {team.emblem_url ? (
                            <img src={team.emblem_url} alt={team.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm sm:text-lg font-bold text-[#00e677]">{team.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs sm:text-sm font-medium truncate">{team.name}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">
                            {membership.role === "OWNER" ? "팀장" : membership.role === "MANAGER" ? "매니저" : "멤버"}
                            {membership.back_number && ` · #${membership.back_number}`}
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 group-hover:text-[#00e677] transition-colors shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 sm:py-8 text-center">
                  <p className="text-gray-500 text-xs sm:text-sm">소속 팀이 없습니다</p>
                </div>
              )}
            </section>

            <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#00e677]" />
                  최근 경기
                </h3>
                <Link href="/matches" className="text-[10px] sm:text-xs text-[#8eccae] hover:text-white transition-colors">
                  전체보기
                </Link>
              </div>

              {recentMatches.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {recentMatches.map((record) => {
                    const match = record.match;
                    if (!match) return null;

                    const isWin = (match.home_score ?? 0) > (match.away_score ?? 0);
                    const isDraw = match.home_score === match.away_score;
                    const result = match.status === "FINISHED"
                      ? (isWin ? "WIN" : isDraw ? "DRAW" : "LOSE")
                      : "SCHEDULED";

                    return (
                      <Link
                        key={record.id}
                        href={`/matches/${match.id}`}
                        className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-black/20 hover:bg-black/30 transition-colors group"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className={`size-7 sm:size-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${
                            result === "WIN" ? "bg-[#00e677]/20 text-[#00e677]" :
                            result === "DRAW" ? "bg-gray-500/20 text-gray-400" :
                            result === "LOSE" ? "bg-red-500/20 text-red-400" :
                            "bg-blue-500/20 text-blue-400"
                          }`}>
                            {result === "WIN" ? "W" : result === "DRAW" ? "D" : result === "LOSE" ? "L" : "-"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-xs sm:text-sm font-medium truncate">vs {match.opponent_name}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              {new Date(match.match_date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          {match.status === "FINISHED" && (
                            <span className="text-[10px] sm:text-sm text-gray-400">
                              {record.goals > 0 && `${record.goals}G`}
                              {record.goals > 0 && record.assists > 0 && " "}
                              {record.assists > 0 && `${record.assists}A`}
                              {record.goals === 0 && record.assists === 0 && "-"}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 group-hover:text-[#00e677] transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 sm:py-8 text-center">
                  <p className="text-gray-500 text-xs sm:text-sm">경기 기록이 없습니다</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, highlight = false, className = "" }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean; className?: string }) {
  return (
    <div className={`bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-lg sm:rounded-xl p-2.5 sm:p-4 ${className}`}>
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
        <div className={`${highlight ? "text-[#00e677]" : "text-[#8eccae]"}`}>{icon}</div>
        <span className="text-[10px] sm:text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <p className={`text-xl sm:text-2xl md:text-3xl font-black ${highlight ? "text-[#00e677]" : "text-white"}`}>{value}</p>
    </div>
  );
}
