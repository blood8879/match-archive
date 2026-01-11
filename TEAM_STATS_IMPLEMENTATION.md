# 팀 통계 DB 연동 구현 완료

## 개요
팀 상세 페이지의 하드코딩된 통계 데이터를 실제 데이터베이스와 연동하여 동적으로 표시하도록 구현했습니다.

## 구현된 기능

### 1. 통산 승률 (Win Rate)
**이전**: 하드코딩된 값 `65.4%`, `26전 17승 5무 4패`

**현재**: 실제 완료된 경기 데이터를 기반으로 계산
- 총 경기 수
- 승/무/패 횟수
- 승률 (소수점 1자리)
- 경기가 없을 경우 "기록 없음" 표시

### 2. 최근 5경기 (Recent Matches)
**이전**: 하드코딩된 결과 `W W L D W`

**현재**: 최근 5경기의 실제 결과 표시
- W (승리): 초록색 배경
- D (무승부): 회색 배경
- L (패배): 어두운 회색 배경
- 각 경기에 마우스 오버 시 상대팀명과 스코어 표시
- 3승 이상 시 "최근 폼 상승세 🔥" 메시지
- 경기가 없을 경우 "경기 기록 없음" 표시

### 3. 경기당 평균 득점 (Average Goals)
**이전**: 하드코딩된 값 `2.4골`, `총 득점 62 / 실점 28`

**현재**: 실제 경기 데이터를 기반으로 계산
- 경기당 평균 득점 (소수점 1자리)
- 총 득점 및 실점 수
- 경기가 없을 경우 "0골", "경기 기록 없음" 표시

### 4. 다음 경기 일정 (Next Match)
**이전**: 하드코딩된 텍스트 `일정 없음`

**현재**: 실제 예정된 경기 정보 표시
- 상대팀명
- 경기 일시 (formatDateTime 사용)
- 경기 장소
- 예정된 경기가 없을 경우 "일정 없음" 표시

## 파일 구조

### 신규 파일
```
src/services/team-stats.ts
```
- `getTeamStatistics()`: 팀 전체 통계 계산
- `getRecentMatches()`: 최근 N경기 결과 반환
- `getNextMatch()`: 다음 예정 경기 반환

### 수정 파일
```
src/app/(protected)/teams/[id]/page.tsx
```
- team-stats 서비스 import 추가
- 통계 데이터 fetch 로직 추가
- UI 컴포넌트를 동적 데이터로 업데이트

## 데이터 구조

### TeamStatistics Type
```typescript
type TeamStatistics = {
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  totalGoalsScored: number;
  totalGoalsConceded: number;
  averageGoalsPerMatch: number;
};
```

### RecentMatch Type
```typescript
type RecentMatch = {
  result: "W" | "D" | "L";
  homeScore: number;
  awayScore: number;
  opponentName: string;
  matchDate: string;
};
```

## 쿼리 로직

### 승률 계산
- `status = "FINISHED"` 인 경기만 조회
- home_score와 away_score 비교하여 승/무/패 판정
- 승률 = (승 / 총 경기 수) × 100

### 최근 경기
- `status = "FINISHED"` 인 경기를 `match_date` 기준 내림차순 정렬
- 최대 5개 limit

### 평균 득점
- 총 득점 / 총 경기 수
- 소수점 1자리로 반올림

### 다음 경기
- `status = "SCHEDULED"` 인 경기 조회
- `match_date >= now()` 조건
- `match_date` 기준 오름차순 정렬
- 첫 번째 결과 반환

## 엣지 케이스 처리

1. **경기가 없는 경우**
   - 승률: "기록 없음"
   - 최근 경기: "경기 기록 없음"
   - 평균 득점: "0골"
   - 다음 경기: "일정 없음"

2. **진행 중인 경기**
   - `status = "SCHEDULED"` 또는 `"IN_PROGRESS"` 경기는 통계에서 제외
   - 완료된 경기(`FINISHED`)만 통계에 포함

3. **NULL 값 처리**
   - home_score, away_score가 NULL인 경우 0으로 처리
   - location이 NULL인 경우 "장소 미정" 표시

## 성능 최적화

1. **인덱스 활용**
   - team_id, status, match_date 조합 쿼리에 인덱스 사용
   - 정렬 및 필터링 성능 최적화

2. **데이터 페칭**
   - 필요한 필드만 select (현재는 `*` 사용)
   - 최근 경기는 limit 5로 제한

## 테스트 체크리스트

- [ ] 경기가 없는 팀 표시 확인
- [ ] 경기가 1개만 있는 팀 표시 확인
- [ ] 최근 경기가 5개 미만인 팀 표시 확인
- [ ] 최근 경기가 5개 이상인 팀 표시 확인
- [ ] 다음 경기가 있는 팀 표시 확인
- [ ] 다음 경기가 없는 팀 표시 확인
- [ ] 승률 계산 정확성 확인
- [ ] 평균 득점 계산 정확성 확인
- [ ] formatDateTime 동작 확인

## Git Worktree 사용

이 작업은 별도의 git worktree에서 진행되었습니다:
```bash
# Worktree 생성
git worktree add ../match-archive-team-stats -b feature/team-stats-db main

# 작업 완료 후
cd ../match-archive-team-stats
git add .
git commit -m "feat: integrate team statistics with database"

# Main으로 돌아가서 merge
cd ../match-archive
git merge feature/team-stats-db

# Worktree 제거
git worktree remove ../match-archive-team-stats
```

## 다음 단계 (선택사항)

- [ ] 통계 데이터 캐싱 (Redis 또는 Next.js cache)
- [ ] 시즌별 통계 분리
- [ ] 월별/분기별 통계
- [ ] 선수별 개인 통계
- [ ] 그래프 및 차트 추가
- [ ] 상대 전적 통계
