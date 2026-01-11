import { notFound } from "next/navigation";
import { getTeamById, getTeamMembers } from "@/services/teams";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MapPin, Calendar, Copy, Zap, Users, UserPlus, Star } from "lucide-react";
import { MemberList } from "./member-list";
import { JoinTeamButton } from "./join-team-button";

interface TeamDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let team;
  let members;

  try {
    team = await getTeamById(id);
    members = await getTeamMembers(id);
  } catch {
    notFound();
  }

  if (!team) {
    notFound();
  }

  const currentUserMembership = members.find((m) => m.user_id === user?.id);
  const isManager =
    currentUserMembership?.role === "OWNER" ||
    currentUserMembership?.role === "MANAGER";
  const isMember = currentUserMembership?.status === "active";
  const isPending = currentUserMembership?.status === "pending";

  const activeMembers = members.filter(
    (m) => m.status === "active" && !m.is_guest
  );
  const pendingMembers = members.filter((m) => m.status === "pending");
  const guestMembers = members.filter((m) => m.is_guest);

  return (
    <main className="relative z-10 flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      <section className="glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between shadow-lg">
        <div className="flex flex-col md:flex-row gap-6 items-center w-full md:w-auto">
          <div className="relative group">
            <div className="size-32 md:size-36 rounded-full bg-gradient-to-br from-[#214a36] to-[#0f2319] p-1 shadow-2xl ring-2 ring-white/10">
              {team.emblem_url ? (
                <img
                  src={team.emblem_url}
                  alt={team.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#1a4031] flex items-center justify-center">
                  <Zap className="w-16 h-16 text-[#06e076]" />
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 bg-primary text-[#0f2319] text-xs font-bold px-2 py-1 rounded-full border-2 border-[#10231a]">
              LV. {team.member_count || 1}
            </div>
          </div>

          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{team.name}</h2>
              <span className="material-symbols-outlined text-primary" title="인증된 팀">verified</span>
            </div>
            <p className="text-[#8eccae] text-base mb-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {team.region || "지역 미설정"} · {new Date().getFullYear()}년 설립
            </p>
            <div className="flex gap-2 text-sm text-gray-300">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">#매너팀</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">#주말오전</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">#2030</span>
            </div>
            {isManager && (
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded bg-[#214a36] px-2 py-1 text-xs text-[#8eccae]">
                  초대코드: {team.code}
                </span>
                <button className="text-[#8eccae] hover:text-white" title="복사">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
          {!currentUserMembership && <JoinTeamButton teamId={team.id} />}
          {isPending && (
            <button disabled className="flex-1 sm:flex-none h-12 px-8 rounded-xl bg-[#214a36] text-white/50 font-bold text-base border border-white/5 flex items-center justify-center gap-2 cursor-not-allowed">
              승인 대기 중
            </button>
          )}
          {isMember && (
            <Link
              href={`/teams/${team.id}/matches/new`}
              className="flex-1 sm:flex-none h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-[#0f2319] font-bold text-base transition-all shadow-[0_0_20px_rgba(6,224,118,0.2)] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">event</span>
              경기 등록
            </Link>
          )}
          <button className="flex-1 sm:flex-none h-12 px-6 rounded-xl bg-[#214a36] hover:bg-[#2b5d45] text-white font-semibold text-base transition-all border border-white/5 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">chat</span>
            문의하기
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] bg-primary/20 w-24 h-24 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors"></div>
          <div className="flex items-start justify-between">
            <p className="text-[#8eccae] text-sm font-medium">통산 승률</p>
            <span className="material-symbols-outlined text-primary text-xl">trophy</span>
          </div>
          <div>
            <span className="text-3xl font-bold text-white">65.4%</span>
            <p className="text-xs text-gray-400 mt-1">26전 17승 5무 4패</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32">
          <p className="text-[#8eccae] text-sm font-medium mb-2">최근 5경기</p>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary flex items-center justify-center text-[#0f2319] font-bold text-xs shadow-lg shadow-primary/20">W</div>
            <div className="size-8 rounded-full bg-primary flex items-center justify-center text-[#0f2319] font-bold text-xs shadow-lg shadow-primary/20">W</div>
            <div className="size-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-xs">L</div>
            <div className="size-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold text-xs">D</div>
            <div className="size-8 rounded-full bg-primary flex items-center justify-center text-[#0f2319] font-bold text-xs shadow-lg shadow-primary/20">W</div>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">최근 폼 상승세 🔥</p>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32">
          <div className="flex items-start justify-between">
            <p className="text-[#8eccae] text-sm font-medium">경기당 평균 득점</p>
            <span className="material-symbols-outlined text-[#8eccae] text-xl">sports_soccer</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">2.4</span>
              <span className="text-sm text-primary font-medium">골</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">총 득점 62 / 실점 28</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32 border-l-4 border-l-primary">
          <p className="text-[#8eccae] text-sm font-medium">다음 경기 일정</p>
          <div>
            <p className="text-white font-bold truncate">일정 없음</p>
            <p className="text-sm text-gray-300 mt-1">경기를 생성하세요</p>
            <p className="text-xs text-[#8eccae] mt-1">올림픽공원 제2구장</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-2xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#00e677] rounded-full"></span>
              팀 소개
            </h3>
            <div className="text-gray-300 max-w-none">
              <p className="leading-relaxed text-base">
                <strong>{team.name}</strong>은 축구를 사랑하는 사람들이 모여 만든 팀입니다. 
                승리도 중요하지만 부상 없이 즐겁게 차는 것을 최우선으로 생각합니다.
              </p>
              <p className="leading-relaxed text-base mt-4">
                {team.region ? `주로 ${team.region} 일대에서 활동하며, ` : ""}
                정기 매치와 자체 리그를 진행하고 있습니다. 
                실력보다는 열정과 매너를 갖춘 분들을 환영합니다!
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[#8eccae] text-xs font-medium mb-1">주 활동 지역</p>
                <p className="text-white text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {team.region || "미설정"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[#8eccae] text-xs font-medium mb-1">주 활동 시간</p>
                <p className="text-white text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  주말
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[#8eccae] text-xs font-medium mb-1">팀원 수</p>
                <p className="text-white text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {team.member_count || 0}명
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[#8eccae] text-xs font-medium mb-1">모집 상태</p>
                <p className="text-white text-sm font-semibold flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  모집중
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-2xl p-6 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">팀 멤버 <span className="text-[#8eccae] text-base font-normal ml-1">{activeMembers.length}</span></h3>
              {isManager ? (
                <Link href={`/teams/${team.id}/manage/members`} className="text-xs text-[#8eccae] hover:text-white">관리하기</Link>
              ) : (
                <Link href="#" className="text-xs text-[#8eccae] hover:text-white">전체보기</Link>
              )}
            </div>

            {activeMembers.length > 0 && activeMembers[0] && (
              <div className="flex items-center gap-4 mb-6 bg-gradient-to-r from-[#00e677]/20 to-transparent p-3 rounded-xl border border-[#00e677]/10">
                <div className="relative">
                  <div className="size-12 rounded-full bg-[#214a36] flex items-center justify-center text-[#00e677] font-bold">
                    {activeMembers[0].user?.nickname?.charAt(0) || "?"}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black rounded-full p-0.5 border border-[#10231a]">
                    <Star className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#00e677] font-bold uppercase tracking-wider">
                    {activeMembers[0].role === "OWNER" ? "Owner" : activeMembers[0].role === "MANAGER" ? "Manager" : "Member"}
                  </p>
                  <p className="text-white font-bold text-sm">{activeMembers[0].user?.nickname || "Unknown"}</p>
                  <p className="text-xs text-gray-400">{activeMembers[0].user?.position || "미지정"}</p>
                </div>
              </div>
            )}

            <MemberList members={activeMembers.slice(1, 7)} isManager={isManager} />

            {activeMembers.length > 7 && (
              <div className="mt-4 text-center">
                <Link href="#" className="text-sm text-[#8eccae] hover:text-white">
                  +{activeMembers.length - 7}명 더보기
                </Link>
              </div>
            )}
          </section>

          {isManager && pendingMembers.length > 0 && (
            <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-yellow-400">가입 대기 <span className="text-yellow-400/70 text-base font-normal ml-1">{pendingMembers.length}</span></h3>
              </div>
              <MemberList members={pendingMembers} isManager={isManager} showActions />
            </section>
          )}

          {guestMembers.length > 0 && (
            <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-400">용병 <span className="text-gray-500 text-base font-normal ml-1">{guestMembers.length}</span></h3>
              </div>
              <MemberList members={guestMembers} isManager={isManager} />
            </section>
          )}
        </div>
      </div>

      {isManager && (
        <div className="flex justify-end gap-3">
          <Link
            href={`/teams/${team.id}/guests/new`}
            className="h-10 px-6 rounded-xl bg-[#214a36] hover:bg-[#2b5d45] text-white font-medium text-sm transition-all border border-white/5 flex items-center justify-center"
          >
            용병 추가
          </Link>
        </div>
      )}
    </main>
  );
}
