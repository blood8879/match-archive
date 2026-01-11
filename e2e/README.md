# E2E Test Suite

This directory contains end-to-end tests for the Match Archive application using Playwright.

## Test Files

### `critical-path.spec.ts`
**Critical Path Test Suite** - Tests the complete user journey from signup to match creation.

#### Main Test: "complete user journey from signup to match creation"
This comprehensive test validates the entire application flow:

1. **User Signup** (회원가입)
   - Generates unique email and credentials
   - Fills out signup form with email, password, and password confirmation
   - Submits form and validates successful registration

2. **Onboarding** (온보딩)
   - Verifies redirect to onboarding page
   - Enters nickname (닉네임)
   - Selects position (FW/MF/DF/GK)
   - Selects region (서울, etc.)
   - Submits profile setup

3. **Dashboard Redirect** (대시보드 리다이렉트)
   - Confirms successful redirect to `/dashboard`
   - Verifies user nickname is displayed
   - Validates dashboard content loads properly

4. **Team Creation** (팀 생성)
   - Navigates to team creation page via "팀 만들기" link
   - Fills out team information:
     - Team name (팀명)
     - Region (지역)
     - Established year (창단 연도)
     - Home color (홈 유니폼 색상)
   - Submits team creation form

5. **Team Detail Page** (팀 상세 페이지)
   - Verifies redirect to team detail page `/teams/{id}`
   - Validates team name is displayed
   - Confirms team information is visible

6. **Owner Verification** (소유자 확인)
   - Checks for "Owner" or "팀장" badge
   - Verifies test user's nickname appears as owner
   - Confirms "경기 등록" button is visible (member-only feature)

7. **Match Creation** (경기 생성)
   - Clicks "경기 등록" button
   - Navigates to match creation page `/teams/{id}/matches/new`
   - Fills out match information:
     - Match date and time (경기 일시)
     - Opponent name (상대팀)
     - Location (장소)
     - Match type (친선, 리그, 토너먼트)
     - Notes (메모)
   - Submits match creation form

8. **Match Confirmation** (경기 생성 확인)
   - Verifies redirect to match detail page `/matches/{id}`
   - Validates match details are displayed:
     - Opponent name
     - Location
     - Match information
   - Confirms successful match creation

#### Error Handling Tests

- **Signup Errors**: Validates password mismatch handling
- **Team Creation Errors**: Tests form validation and authentication
- **Onboarding Errors**: Verifies required field validation
- **Match Date Validation**: Ensures proper date validation

## Running Tests

### Run All Tests
```bash
npm run test:e2e
```

### Run Critical Path Test Only
```bash
npx playwright test e2e/critical-path.spec.ts
```

### Run in UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Run Specific Test
```bash
npx playwright test -g "complete user journey"
```

### Debug Mode
```bash
npx playwright test --debug
```

### Run on Specific Browser
```bash
# Chromium only
npx playwright test --project=chromium

# Mobile Chrome only
npx playwright test --project="Mobile Chrome"
```

## Test Configuration

Tests are configured in `/playwright.config.ts`:
- Base URL: `http://localhost:3000`
- Test directory: `./e2e`
- Browsers: Chromium (Desktop), Mobile Chrome
- Retries: 2 (in CI), 0 (locally)
- Timeout: 120000ms (2 minutes for critical path)
- Auto-start dev server: Yes

## Test Data

The critical path test generates unique data for each run:
- **Email**: `test-user-{timestamp}-{random}@example.com`
- **Password**: `TestPassword123!`
- **Nickname**: `TestUser{timestamp}`
- **Team Name**: `Test Team {timestamp}`

This ensures tests can run multiple times without conflicts.

## Debugging Tips

### View Test Results
```bash
npx playwright show-report
```

### Generate Trace
Traces are automatically generated on first retry. View with:
```bash
npx playwright show-trace trace.zip
```

### Screenshots
Screenshots are captured on failure in `test-results/` directory.

### Console Logs
The critical path test includes detailed console.log statements for each step:
```
Step 1: Starting user signup...
✓ User signup completed with email: test-user-xxx@example.com
Step 2: Starting onboarding...
✓ Onboarding completed with nickname: TestUserXXXX
...
🎉 Critical Path Test PASSED - All steps completed successfully!
```

## Best Practices

1. **Always run tests against a clean database** in test environment
2. **Use unique test data** to avoid conflicts
3. **Set appropriate timeouts** for network operations
4. **Add descriptive console logs** for debugging
5. **Test error cases** in addition to happy path
6. **Use proper selectors** (prefer role, label, text over CSS)
7. **Wait for navigation** and element visibility
8. **Handle async operations** properly

## Continuous Integration

Tests run automatically in CI with:
- 2 retries on failure
- Single worker (sequential execution)
- HTML reporter for results
- Automatic dev server startup

## Other Test Files

- `auth.spec.ts`: Authentication flow tests (signup, login, protected routes)
- `teams.spec.ts`: Team-related functionality tests
- `matches.spec.ts`: Match management tests
- `results.spec.ts`: Match result recording tests

## Requirements

- Node.js 18+
- Playwright installed (`npx playwright install`)
- Development server running (auto-started by config)
- Supabase instance configured

## Environment Variables

Ensure the following are set in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Troubleshooting

### Test Timeout
- Increase timeout in test: `test.setTimeout(180000)`
- Check network conditions
- Verify dev server is running

### Element Not Found
- Check if element exists in current UI
- Verify selector is correct
- Add wait conditions: `{ timeout: 10000 }`

### Authentication Issues
- Ensure Supabase is configured
- Check email confirmation settings
- Verify auth redirects are working

### Database State
- Tests may fail if database has conflicting data
- Use unique test data generation
- Consider database cleanup between test runs
