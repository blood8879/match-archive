/**
 * 테스트 데이터를 생성하는 스크립트
 * 팀 생성, 팀원 추가, 경기 생성, 참석 기록 등을 자동으로 생성
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 환경 변수가 설정되지 않았습니다:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL");
  console.error("   SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testUserEmails = [
  "test1@example.com",
  "test2@example.com",
  "test3@example.com",
  "test4@example.com",
  "test5@example.com",
];

async function populateTestData() {
  console.log("🚀 테스트 데이터 생성을 시작합니다...\n");

  // 1. 테스트 사용자 ID 가져오기
  console.log("📋 1. 테스트 사용자 ID 가져오기...");
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error("❌ 사용자 목록 가져오기 실패:", usersError.message);
    process.exit(1);
  }

  const testUsers = users.users
    .filter((u) => testUserEmails.includes(u.email || ""))
    .sort((a, b) => {
      const aIndex = testUserEmails.indexOf(a.email || "");
      const bIndex = testUserEmails.indexOf(b.email || "");
      return aIndex - bIndex;
    });

  if (testUsers.length < 5) {
    console.error("❌ 테스트 사용자가 충분하지 않습니다. 먼저 create-test-users.ts를 실행하세요.");
    process.exit(1);
  }

  const [owner, member1, member2, member3, member4] = testUsers;
  console.log(`✅ 사용자 ID 확인 완료 (${testUsers.length}명)\n`);

  // 2. 팀 생성
  console.log("🏀 2. 팀 생성...");
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      name: "테스트 FC",
      owner_id: owner.id,
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      region: "서울",
    })
    .select()
    .single();

  if (teamError) {
    console.error("❌ 팀 생성 실패:", teamError.message);
    process.exit(1);
  }

  console.log(`✅ 팀 생성 완료: ${team.name} (${team.code})\n`);

  // 3. 팀장을 팀 멤버로 추가 (OWNER)
  console.log("👤 3. 팀장을 팀 멤버로 추가...");
  const { error: ownerMemberError } = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: owner.id,
    role: "OWNER",
    status: "active",
  });

  if (ownerMemberError) {
    console.error("❌ 팀장 추가 실패:", ownerMemberError.message);
    process.exit(1);
  }

  console.log("✅ 팀장 추가 완료\n");

  // 4. 나머지 멤버를 pending 상태로 추가
  console.log("👥 4. 나머지 멤버를 pending 상태로 추가...");
  const pendingMembers = [member1, member2, member3, member4];
  const { error: membersError } = await supabase
    .from("team_members")
    .insert(
      pendingMembers.map((user) => ({
        team_id: team.id,
        user_id: user.id,
        role: "MEMBER" as const,
        status: "pending" as const,
      }))
    )
    .select();

  if (membersError) {
    console.error("❌ 멤버 추가 실패:", membersError.message);
    process.exit(1);
  }

  console.log(`✅ ${pendingMembers.length}명의 멤버를 pending 상태로 추가 완료\n`);

  // 5. 모든 멤버를 active 상태로 승인
  console.log("✅ 5. 모든 가입 신청을 승인...");
  const { error: approveError } = await supabase
    .from("team_members")
    .update({ status: "active" as const })
    .eq("team_id", team.id)
    .eq("status", "pending");

  if (approveError) {
    console.error("❌ 승인 실패:", approveError.message);
    process.exit(1);
  }

  console.log("✅ 모든 멤버 승인 완료\n");

  // 6. 활성 멤버 목록 가져오기
  const { data: activeMembers, error: activeMembersError } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", team.id)
    .eq("status", "active");

  if (activeMembersError || !activeMembers) {
    console.error("❌ 활성 멤버 가져오기 실패");
    process.exit(1);
  }

  // 7. 경기 생성
  console.log("⚽ 6. 경기 생성...");
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 7일 후

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({
      team_id: team.id,
      opponent_name: "라이벌 FC",
      match_date: futureDate.toISOString(),
      location: "서울 풋살장",
      quarters: 4,
      status: "SCHEDULED" as const,
      home_score: 0,
      away_score: 0,
    })
    .select()
    .single();

  if (matchError) {
    console.error("❌ 경기 생성 실패:", matchError.message);
    process.exit(1);
  }

  console.log(`✅ 경기 생성 완료: ${match.opponent_name} (${futureDate.toLocaleDateString()})\n`);

  // 8. 참석 데이터 생성 (선수 2, 3, 4는 참석, 선수 1은 미정)
  console.log("✋ 7. 경기 참석 데이터 생성...");
  const attendanceData = activeMembers
    .filter((m) => m.user_id !== owner.id) // 팀장 제외
    .map((member, index) => ({
      match_id: match.id,
      team_member_id: member.id,
      status: (index === 0 ? "maybe" : "attending") as "attending" | "maybe" | "absent",
    }));

  const { error: attendanceError } = await supabase
    .from("match_attendance")
    .insert(attendanceData);

  if (attendanceError) {
    console.error("❌ 참석 데이터 생성 실패:", attendanceError.message);
    process.exit(1);
  }

  const attendingCount = attendanceData.filter((a) => a.status === "attending").length;
  console.log(`✅ 참석 데이터 생성 완료 (참석: ${attendingCount}명, 미정: 1명)\n`);

  // 9. 결과 출력
  console.log("=" .repeat(60));
  console.log("✅ 모든 테스트 데이터 생성 완료!");
  console.log("=".repeat(60) + "\n");

  console.log("📊 생성된 데이터 요약:\n");
  console.log(`팀: ${team.name} (초대 코드: ${team.code})`);
  console.log(`팀원: ${activeMembers.length}명 (팀장 포함)`);
  console.log(`경기: ${match.opponent_name} vs ${team.name}`);
  console.log(`  - 날짜: ${futureDate.toLocaleDateString("ko-KR")}`);
  console.log(`  - 장소: ${match.location}`);
  console.log(`  - 참석 표시: ${attendingCount}명`);
  console.log(`  - 미정: 1명\n`);

  console.log("🧪 테스트 방법:\n");
  console.log("1. 브라우저에서 http://localhost:3000 접속");
  console.log("2. test1@example.com (비밀번호: test1234)로 로그인");
  console.log("3. 대시보드에서 '테스트 FC' 팀 확인");
  console.log("4. 경기 상세 페이지로 이동");
  console.log("5. '라인업' 섹션에서 참석 표시한 선수들이 상단에 표시되는지 확인");
  console.log("   - 선수2, 선수3, 선수4 옆에 '참석' 배지가 표시되어야 함");
  console.log("   - 선수1은 참석 표시 없이 하단에 표시");
  console.log("6. 라인업을 선택하고 저장\n");

  console.log("📋 테스트 계정:");
  console.log("  팀장: test1@example.com / test1234");
  console.log("  선수들: test2-5@example.com / test1234\n");

  return {
    team,
    match,
    activeMembers,
    attendanceData,
  };
}

// 스크립트 실행
populateTestData()
  .then(() => {
    console.log("✨ 모든 작업이 완료되었습니다.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 스크립트 실행 중 오류 발생:", error);
    process.exit(1);
  });
