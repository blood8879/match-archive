/**
 * 테스트 계정들로 nyc 팀에 가입 신청
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 환경 변수가 설정되지 않았습니다");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const testUserEmails = [
  "test2@example.com",
  "test3@example.com",
  "test4@example.com",
  "test5@example.com",
];

async function joinNycTeam() {
  console.log("🚀 nyc 팀에 가입 신청 시작...\n");

  // 1. nyc 팀 찾기
  console.log("🔍 1. nyc 팀 찾기...");
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .ilike("name", "%nyc%")
    .single();

  if (teamError || !team) {
    console.error("❌ nyc 팀을 찾을 수 없습니다:", teamError?.message);

    // 모든 팀 목록 출력
    const { data: allTeams } = await supabase.from("teams").select("id, name, code");
    console.log("\n사용 가능한 팀 목록:");
    allTeams?.forEach((t) => console.log(`  - ${t.name} (코드: ${t.code})`));

    process.exit(1);
  }

  console.log(`✅ 팀 발견: ${team.name} (${team.code})\n`);

  // 2. 테스트 사용자 ID 가져오기
  console.log("👥 2. 테스트 사용자 ID 가져오기...");
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error("❌ 사용자 목록 가져오기 실패:", usersError.message);
    process.exit(1);
  }

  const testUsers = users.users.filter((u) =>
    testUserEmails.includes(u.email || "")
  );

  if (testUsers.length === 0) {
    console.error("❌ 테스트 사용자를 찾을 수 없습니다.");
    process.exit(1);
  }

  console.log(`✅ ${testUsers.length}명의 테스트 사용자 발견\n`);

  // 3. 각 사용자로 가입 신청
  console.log("📝 3. 가입 신청 중...\n");

  let successCount = 0;
  let alreadyMemberCount = 0;

  for (const user of testUsers) {
    // 이미 멤버인지 확인
    const { data: existing } = await supabase
      .from("team_members")
      .select("id, status")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      console.log(`⚠️  ${user.email} - 이미 팀 멤버입니다 (상태: ${existing.status})`);
      alreadyMemberCount++;
      continue;
    }

    // 가입 신청
    const { error: joinError } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: user.id,
      role: "MEMBER",
      status: "pending",
    });

    if (joinError) {
      console.error(`❌ ${user.email} - 가입 신청 실패:`, joinError.message);
    } else {
      console.log(`✅ ${user.email} - 가입 신청 완료`);
      successCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ 가입 신청 완료!");
  console.log("=".repeat(60) + "\n");

  console.log(`📊 결과 요약:`);
  console.log(`  - 새로운 가입 신청: ${successCount}명`);
  console.log(`  - 이미 멤버: ${alreadyMemberCount}명`);
  console.log(`  - 총 처리: ${testUsers.length}명\n`);

  if (successCount > 0) {
    console.log("🎯 다음 단계:");
    console.log("  1. 브라우저에서 팀장 계정으로 로그인");
    console.log("  2. 팀 관리 → 팀원 관리 페이지로 이동");
    console.log(`  3. ${successCount}명의 가입 대기 멤버 승인\n`);
  }
}

joinNycTeam()
  .then(() => {
    console.log("✨ 모든 작업이 완료되었습니다.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 스크립트 실행 중 오류 발생:", error);
    process.exit(1);
  });
