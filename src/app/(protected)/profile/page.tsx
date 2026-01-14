import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Trophy,
  Target,
  Users,
  Shield,
  Zap,
  Star,
  TrendingUp,
  Calendar,
  ChevronRight,
  Settings
} from "lucide-react";
import type { User, TeamMember, Team, Match, MatchRecord } from "@/types/supabase";
import { PlayerCodeBadge } from "./player-code-badge";

type TeamMemberWithTeam = TeamMember & { team: Team | null };
type MatchRecordWithMatch = MatchRecord & { match: Match & { team: Team | null } | null };

function getTier(matches: number) {
  if (matches >= 100) return { name: "프로", color: "text-yellow-400", bg: "bg-yellow-500/20" };
  if (matches >= 50) return { name: "세미 프로", color: "text-purple-400", bg: "bg-purple-500/20" };
  if (matches >= 20) return { name: "아마추어 1", color: "text-blue-400", bg: "bg-blue-500/20" };
  if (matches >= 10) return { name: "아마추어 2", color: "text-green-400", bg: "bg-green-500/20" };
  return { name: "루키", color: "text-gray-400", bg: "bg-gray-500/20" };
}

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
    .eq("status", "active");

  const myTeams = myTeamsRaw as TeamMemberWithTeam[] | null;
  const firstTeam = myTeams?.[0]?.team;

  const memberIds = myTeams?.map((t) => t.id) ?? [];
  let totalGoals = 0;
  let totalAssists = 0;
  let matchesPlayed = 0;
  let recentMatches: MatchRecordWithMatch[] = [];

  if (memberIds.length > 0) {
    const { data: myRecords } = await supabase
      .from("match_records")
      .select("*, match:matches(*, team:teams!matches_team_id_fkey(*))")
      .in("team_member_id", memberIds)
      .order("created_at", { ascending: false })
      .limit(10);

    if (myRecords) {
      const typedRecords = myRecords as MatchRecordWithMatch[];
      // FINISHED 상태의 경기만 필터링
      const finishedRecords = typedRecords.filter((r) => r.match?.status === "FINISHED");

      totalGoals = finishedRecords.reduce((sum, r) => sum + r.goals, 0);
      totalAssists = finishedRecords.reduce((sum, r) => sum + r.assists, 0);
      matchesPlayed = finishedRecords.length;
      recentMatches = finishedRecords.slice(0, 5);
    }
  }

  const tier = getTier(matchesPlayed);
  const xpProgress = Math.min((matchesPlayed % 10) * 10, 100);

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00e677]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#214a36]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="relative">
              <div className="size-28 md:size-32 rounded-full bg-gradient-to-br from-[#214a36] to-[#0f2319] p-1 shadow-2xl ring-2 ring-white/10 overflow-hidden">
                {typedProfile?.avatar_url ? (
                  <img
                    src={typedProfile.avatar_url}
                    alt={typedProfile.nickname || "User"}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#1a4031] flex items-center justify-center">
                    <span className="text-4xl md:text-5xl font-bold text-[#00e677]">
                      {typedProfile?.nickname?.charAt(0) || "U"}
                    </span>
                  </div>
                )}
              </div>
              <div className={`absolute -bottom-1 -right-1 ${tier.bg} ${tier.color} text-xs font-bold px-2.5 py-1 rounded-full border-2 border-[#10231a]`}>
                {tier.name}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {typedProfile?.nickname || "사용자"}
                </h1>
                {typedProfile?.position && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold w-fit mx-auto md:mx-0 ${
                    typedProfile.position === "FW" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                    typedProfile.position === "MF" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                    typedProfile.position === "DF" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                    "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  }`}>
                    {typedProfile.position} · {getPositionLabel(typedProfile.position)}
                  </span>
                )}
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-[#8eccae] text-sm md:text-base mb-4">
                {firstTeam ? (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {firstTeam.name}
                  </span>
                ) : (
                  <span>소속 팀 없음</span>
                )}
                {typedProfile?.user_code && (
                  <PlayerCodeBadge code={typedProfile.user_code} />
                )}
              </div>

              <p className="text-gray-400 text-sm max-w-md mx-auto md:mx-0">
                축구를 사랑하는 플레이어. 팀과 함께 성장하며 즐거운 경기를 추구합니다.
              </p>

              <div className="mt-4 flex gap-3 justify-center md:justify-start">
                <Link
                  href="/settings"
                  className="flex items-center gap-2 h-10 px-5 rounded-xl bg-[#00e677] hover:bg-[#00e677]/90 text-[#0f2319] font-bold text-sm transition-all shadow-[0_0_15px_rgba(6,224,118,0.2)]"
                >
                  <Settings className="w-4 h-4" />
                  프로필 편집
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <StatCard icon={<Calendar className="w-5 h-5" />} label="경기 수" value={matchesPlayed} />
          <StatCard icon={<Target className="w-5 h-5" />} label="골" value={totalGoals} highlight />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="어시스트" value={totalAssists} />
          <StatCard icon={<Star className="w-5 h-5" />} label="MOM" value={0} />
          <StatCard icon={<Shield className="w-5 h-5" />} label="클린시트" value={0} className="col-span-2 md:col-span-1" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#00e677]" />
              플레이 스타일 분석
            </h3>

            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex flex-col items-center justify-center">
                <div className="relative size-28 md:size-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#00e677" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${78 * 2.83} ${100 * 2.83}`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl md:text-4xl font-black text-white">7.8</span>
                    <span className="text-xs text-[#8eccae]">종합 평점</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <SkillBar label="결정력" value={matchesPlayed > 0 ? 75 : 50} />
                <SkillBar label="패스" value={matchesPlayed > 0 ? 68 : 50} />
                <SkillBar label="드리블" value={matchesPlayed > 0 ? 82 : 50} />
                <SkillBar label="수비 가담" value={matchesPlayed > 0 ? 45 : 50} />
                <SkillBar label="체력" value={matchesPlayed > 0 ? 70 : 50} />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-sm text-[#8eccae] mb-3">플레이 스타일</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-[#00e677]/10 text-[#00e677] text-sm font-medium border border-[#00e677]/20">
                  스피드 스타
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20">
                  플레이 메이커
                </span>
                {totalGoals > 5 && (
                  <span className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-sm font-medium border border-yellow-500/20">
                    골 게터
                  </span>
                )}
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#00e677]" />
                티어 & 경험치
              </h3>

              <div className="flex items-center gap-4 mb-4">
                <div className={`size-14 rounded-xl ${tier.bg} flex items-center justify-center`}>
                  <Trophy className={`w-7 h-7 ${tier.color}`} />
                </div>
                <div>
                  <p className={`text-lg font-bold ${tier.color}`}>{tier.name}</p>
                  <p className="text-xs text-gray-400">현재 티어</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">경험치</span>
                  <span className="text-white font-medium">{matchesPlayed * 100} XP</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#00e677] to-teal-400 rounded-full transition-all" style={{ width: `${xpProgress}%` }} />
                </div>
                <p className="text-xs text-gray-500 text-right">
                  다음 티어까지 {10 - (matchesPlayed % 10)}경기
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-sm text-[#8eccae]">
                  상위 <span className="text-[#00e677] font-bold">15%</span>의 실력입니다
                </p>
              </div>
            </section>

            <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#00e677]" />
                  최근 경기
                </h3>
                <Link href="/matches" className="text-xs text-[#8eccae] hover:text-white transition-colors">
                  전체보기
                </Link>
              </div>

              {recentMatches.length > 0 ? (
                <div className="space-y-3">
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
                        className="flex items-center justify-between p-3 rounded-xl bg-black/20 hover:bg-black/30 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`size-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            result === "WIN" ? "bg-[#00e677]/20 text-[#00e677]" :
                            result === "DRAW" ? "bg-gray-500/20 text-gray-400" :
                            result === "LOSE" ? "bg-red-500/20 text-red-400" :
                            "bg-blue-500/20 text-blue-400"
                          }`}>
                            {result === "WIN" ? "W" : result === "DRAW" ? "D" : result === "LOSE" ? "L" : "-"}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">vs {match.opponent_name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(match.match_date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {match.status === "FINISHED" && (
                            <span className="text-sm text-gray-400">
                              {record.goals > 0 && `${record.goals}G`}
                              {record.goals > 0 && record.assists > 0 && " "}
                              {record.assists > 0 && `${record.assists}A`}
                              {record.goals === 0 && record.assists === 0 && "-"}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#00e677] transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500 text-sm">경기 기록이 없습니다</p>
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
    <div className={`bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`${highlight ? "text-[#00e677]" : "text-[#8eccae]"}`}>{icon}</div>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <p className={`text-2xl md:text-3xl font-black ${highlight ? "text-[#00e677]" : "text-white"}`}>{value}</p>
    </div>
  );
}

function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#00e677] to-teal-400 rounded-full transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
