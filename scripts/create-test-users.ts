/**
 * 테스트 계정 5개를 생성하는 스크립트
 *
 * 사용법:
 * 1. Supabase 프로젝트의 API URL과 Service Role Key가 필요합니다
 * 2. .env 파일에 다음을 추가:
 *    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 * 3. 실행: npx tsx scripts/create-test-users.ts
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

// Service Role Key로 Admin 클라이언트 생성
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testUsers = [
  {
    email: "test1@example.com",
    password: "test1234",
    nickname: "팀장",
    position: "MF" as const,
    role: "owner" as const,
  },
  {
    email: "test2@example.com",
    password: "test1234",
    nickname: "선수1",
    position: "FW" as const,
    role: "member" as const,
  },
  {
    email: "test3@example.com",
    password: "test1234",
    nickname: "선수2",
    position: "DF" as const,
    role: "member" as const,
  },
  {
    email: "test4@example.com",
    password: "test1234",
    nickname: "선수3",
    position: "MF" as const,
    role: "member" as const,
  },
  {
    email: "test5@example.com",
    password: "test1234",
    nickname: "선수4",
    position: "GK" as const,
    role: "member" as const,
  },
];

async function createTestUsers() {
  console.log("🚀 테스트 계정 생성을 시작합니다...\n");

  const createdUsers: Array<{
    email: string;
    password: string;
    userId: string;
    nickname: string;
    role: string;
  }> = [];

  for (const user of testUsers) {
    try {
      // 1. 이미 존재하는 사용자인지 확인
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const userExists = existingUser?.users?.some((u) => u.email === user.email);

      if (userExists) {
        console.log(`⚠️  ${user.email} - 이미 존재하는 계정입니다. 건너뜁니다.`);
        continue;
      }

      // 2. Auth 사용자 생성 (이메일 확인 자동으로 완료)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // 이메일 확인 자동 완료
      });

      if (authError || !authData.user) {
        console.error(`❌ ${user.email} - Auth 생성 실패:`, authError?.message);
        continue;
      }

      // 3. Users 테이블에 프로필 정보 추가
      const { error: profileError } = await supabase
        .from("users")
        .update({
          nickname: user.nickname,
          position: user.position,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error(`❌ ${user.email} - 프로필 업데이트 실패:`, profileError.message);
        continue;
      }

      createdUsers.push({
        email: user.email,
        password: user.password,
        userId: authData.user.id,
        nickname: user.nickname,
        role: user.role,
      });

      console.log(`✅ ${user.email} - 계정 생성 완료 (${user.nickname}, ${user.position})`);
    } catch (error) {
      console.error(`❌ ${user.email} - 예상치 못한 오류:`, error);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ 테스트 계정 생성 완료!");
  console.log("=".repeat(60) + "\n");

  console.log("📋 생성된 계정 정보:\n");
  createdUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.nickname} (${user.role})`);
    console.log(`   이메일: ${user.email}`);
    console.log(`   비밀번호: ${user.password}`);
    console.log(`   사용자 ID: ${user.userId}\n`);
  });

  console.log("📝 테스트 시나리오:");
  console.log("   1. test1@example.com (팀장)으로 로그인하여 팀 생성 및 경기 생성");
  console.log("   2. test2-5@example.com (선수1-4)로 로그인하여 팀 가입 신청");
  console.log("   3. 팀장으로 돌아가서 가입 신청 승인");
  console.log("   4. 선수들로 경기 참석 버튼 클릭");
  console.log("   5. 팀장이 라인업 선택 시 참석자가 상단에 표시되는지 확인\n");

  return createdUsers;
}

// 스크립트 실행
createTestUsers()
  .then(() => {
    console.log("✨ 모든 작업이 완료되었습니다.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 스크립트 실행 중 오류 발생:", error);
    process.exit(1);
  });
