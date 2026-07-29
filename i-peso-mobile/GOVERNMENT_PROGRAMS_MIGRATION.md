# Mobile: migrate "Upskill Hub" → "Government Programs" + Eligibility

**Goal:** the web app removed the **Upskill Hub** module and replaced it with an admin-managed **Government Programs** board that shows each seeker an **eligibility score + breakdown**. The backend endpoints the mobile app used were deleted, so the mobile **Upskill Hub screen is now broken**. This guide migrates the mobile app to the new API and adds the eligibility UI.

> This is a **frontend-only** change to `i-peso-mobile`. No backend work — the backend is already done and running.

---

## What changed on the backend (the target contract)

| Old (deleted) | New (use this) |
|---|---|
| `GET /seeker/upskill-hub` | `GET /seeker/government-programs` |
| `GET /seeker/upskill-hub/recommended` | **removed** — no "recommended" list anymore |
| `GET /seeker/government-programs/{id}` | **unchanged** ✅ |
| `POST /seeker/government-programs/{id}/apply` | **unchanged** ✅ |
| `GET /seeker/government-program-applications` | **unchanged** ✅ |
| `GET /seeker/citizen-charter` | **unchanged** ✅ |

**New list response** (`GET /seeker/government-programs`) — note there is **no** `recommended` and **no** `job_fairs` anymore:
```jsonc
{
  "programs": { "data": [ /* Program objects */ ], "current_page": 1, "last_page": 2, "total": 8 },
  "categories": { "spes": 1, "tupad": 1, "gip": 1, "ofw_assistance": 1, ... }
}
```

**Every program object** (both list and detail) now carries an `eligibility` field:
```jsonc
{
  "program_id": 12,
  "title": "SPES 2026 Application",
  "category": "spes",
  "status": "open",
  // ...all the existing fields...
  "eligibility": {
    "score": 100,
    "status": "highly_eligible",      // see status table below
    "label": "Highly Eligible",
    "breakdown": [
      { "label": "Age 15 to 30 years old", "met": true,  "required": true,  "detail": "Your age: 22" },
      { "label": "Currently unemployed",   "met": false, "required": true,  "detail": "Your status: employed" }
    ]
  }
}
```

**Eligibility status values** and how to show them:

| `status` | Meaning | Badge variant | Show `score %`? |
|---|---|---|---|
| `highly_eligible` | Meets everything (100%) | `success` | yes |
| `eligible` | Program has no rules (open to all) | `success` | no |
| `partially_eligible` | Passes required rules, 60–99% | `warning` | yes |
| `low_match` | Passes required rules, <60% | `neutral` | yes |
| `not_eligible` | Failed a **required** rule | `danger` | no |
| `unknown` | Could not evaluate | `neutral` | no |

---

## Step 1 — Service layer (`services/seekerService.ts`)

### 1a. Add the eligibility type + field on `GovernmentProgram`
Add this interface near `GovernmentProgram` (around line 278):
```ts
export interface ProgramEligibility {
  score: number
  status:
    | 'highly_eligible' | 'eligible' | 'partially_eligible'
    | 'low_match' | 'not_eligible' | 'unknown' | string
  label: string
  breakdown: Array<{ label: string; met: boolean; required: boolean; detail?: string | null }>
}
```
Then add one field to the `GovernmentProgram` interface:
```ts
export interface GovernmentProgram {
  // ...existing fields...
  eligibility?: ProgramEligibility | null   // <-- add this
}
```

### 1b. Replace `UpskillHubResponse`
The new response has no `recommended` / `job_fairs`. Replace the whole `UpskillHubResponse` interface (lines ~334–339) with:
```ts
export interface GovernmentProgramsResponse {
  programs: { data: GovernmentProgram[]; current_page: number; last_page: number; total: number }
  categories: Record<string, number>
}
```

### 1c. Replace the two methods
Replace `getUpskillHub` (lines ~603–616) **and delete** `getRecommendedPrograms` (lines ~618–621) with a single method:
```ts
async getGovernmentPrograms(
  params: { search?: string; category?: string; status?: string; page?: number; perPage?: number } = {},
): Promise<GovernmentProgramsResponse> {
  const res = await apiClient.get('/seeker/government-programs', {
    params: {
      search: params.search || undefined,
      category: params.category || undefined,
      status: params.status || undefined,
      page: params.page || undefined,
      per_page: params.perPage || 12,
    },
  })
  return res.data
},
```
> The old `skill` / `location` / `deadline` params are gone — the new endpoint only supports `search`, `category`, `status`, and paging.

Everything else in the service (`getGovernmentProgram`, `applyToProgram`, `getProgramApplications`, `programAttachmentUrl`, `uploadProgramDocument`, `getCitizenCharter`) is **unchanged**.

---

## Step 2 — New shared component `components/EligibilityBadge.tsx`

Create this file (reuses the existing `Badge`):
```tsx
import type { ProgramEligibility } from '@/services/seekerService'
import { Badge } from '@/components/ui/Badge'

const MAP: Record<string, { variant: 'success' | 'warning' | 'neutral' | 'danger'; showScore: boolean }> = {
  highly_eligible:    { variant: 'success', showScore: true },
  eligible:           { variant: 'success', showScore: false },
  partially_eligible: { variant: 'warning', showScore: true },
  low_match:          { variant: 'neutral', showScore: true },
  not_eligible:       { variant: 'danger',  showScore: false },
  unknown:            { variant: 'neutral', showScore: false },
}

export function EligibilityBadge({ eligibility }: { eligibility?: ProgramEligibility | null }) {
  if (!eligibility) return null
  const conf = MAP[eligibility.status] ?? MAP.low_match
  const text =
    conf.showScore && typeof eligibility.score === 'number'
      ? `${eligibility.label} · ${eligibility.score}%`
      : eligibility.label
  return <Badge variant={conf.variant}>{text}</Badge>
}
```

---

## Step 3 — Rename + update the LIST screen

Expo Router is **file-based**, so the route name comes from the file path. Rename the files:

```
app/(seeker)/upskill-hub.tsx        →  app/(seeker)/government-programs.tsx
app/(seeker)/upskill-hub/[id].tsx   →  app/(seeker)/government-programs/[id].tsx
```
(Delete the now-empty `app/(seeker)/upskill-hub/` folder.)

Then, inside the renamed **`government-programs.tsx`**:

1. **Import the badge** and add `gip` + `ofw_assistance` to `CATEGORY_LABELS`:
   ```tsx
   import { EligibilityBadge } from '@/components/EligibilityBadge'
   // ...
   const CATEGORY_LABELS: Record<string, string> = {
     job_fair: 'Job Fair', spes: 'SPES', tupad: 'TUPAD',
     gip: 'GIP', ofw_assistance: 'OFW Assistance',        // <-- add these two
     livelihood_program: 'Livelihood', tech_voc_training: 'Tech-Voc Training',
     career_guidance: 'Career Guidance', citizen_charter: 'Citizen Charter', other: 'Other',
   }
   ```

2. **Switch the query** to the new method + key:
   ```tsx
   const { data, isLoading, isFetching, error, refetch } = useQuery({
     queryKey: ['governmentPrograms', debouncedSearch, category, page],
     queryFn: () => seekerService.getGovernmentPrograms({ search: debouncedSearch || undefined, category, page }),
   })
   ```

3. **Delete the "Recommended for you" block** (the `recommended` variable on line ~92 and the whole `{recommended.length > 0 && (…)}` section, lines ~138–160). The new API returns no recommendations.

4. **Fix the Job Fair bulletin** — `data.job_fairs` no longer exists. Remove `const jobFairs = data?.job_fairs ?? []` (line ~93) and change the bulletin subtitle to a static string:
   ```tsx
   <Text style={styles.bulletinSub}>Browse upcoming PESO job fairs</Text>
   ```
   (Keep the card and its "View Job Fairs" button — that navigation still works.)

5. **Rename the header + kicker** so the screen reads as Government Programs:
   ```tsx
   <ScreenHeader title="Government Programs" onBack={() => router.back()} />
   // ...
   <Text style={styles.kicker}>PESO Programs Center</Text>
   ```

6. **Add the eligibility badge to each program card** and fix the two `router.push` targets. In the program card header row (line ~204), add the badge under the category badge:
   ```tsx
   <Badge variant="neutral" style={styles.categoryBadge}>{categoryLabel(program.category)}</Badge>
   <EligibilityBadge eligibility={program.eligibility} />
   ```
   And update **both** navigation calls (lines ~146 and ~201):
   ```tsx
   onPress={() => router.push(`/(seeker)/government-programs/${program.program_id}`)}
   ```

---

## Step 4 — Update the DETAIL screen (`government-programs/[id].tsx`)

1. **Import the badge:**
   ```tsx
   import { EligibilityBadge } from '@/components/EligibilityBadge'
   ```

2. **Show the eligibility badge in the header** badge row (line ~138):
   ```tsx
   <View style={styles.badgeRow}>
     <Badge variant="info">{categoryLabel(program.category)}</Badge>
     <Badge variant={statusVariant(program.status)}>{titleCase(program.status, 'Open')}</Badge>
     <EligibilityBadge eligibility={program.eligibility} />
   </View>
   ```

3. **Add a "Your Eligibility" breakdown section** (put it right above the existing "Eligibility Requirements" section, ~line 162):
   ```tsx
   {program.eligibility?.breakdown?.length ? (
     <>
       <Text style={styles.sectionTitle}>Your Eligibility</Text>
       <Card padding="md" style={styles.infoCard}>
         {program.eligibility.breakdown.map((item, index) => (
           <View key={index} style={styles.eligRow}>
             <Text style={[styles.eligIcon, { color: item.met ? colors.success : colors.danger }]}>
               {item.met ? '✓' : '✗'}
             </Text>
             <View style={styles.eligBody}>
               <Text style={styles.eligLabel}>
                 {item.label}{item.required && !item.met ? '  (required)' : ''}
               </Text>
               {item.detail ? <Text style={styles.eligDetail}>{item.detail}</Text> : null}
             </View>
           </View>
         ))}
       </Card>
     </>
   ) : null}
   ```
   Add these styles to the `StyleSheet.create({…})` block:
   ```tsx
   eligRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
   eligIcon: { fontSize: typography.body, fontWeight: typography.bold, width: 18 },
   eligBody: { flex: 1 },
   eligLabel: { color: colors.primary, fontSize: typography.small, fontWeight: typography.semibold },
   eligDetail: { color: colors.secondaryText, fontSize: typography.small, marginTop: 2 },
   ```

4. **(Optional) Warn on the Apply button** when not eligible — the backend still lets them apply, so just add a note above the footer:
   ```tsx
   {program.eligibility?.status === 'not_eligible' && !program.my_application ? (
     <AlertBox variant="warning" style={styles.alertBox}>
       Your profile does not meet a required rule. You may still apply, but PESO may not approve it.
     </AlertBox>
   ) : null}
   ```

5. **Fix the invalidateQueries key** (line ~66) so the list refreshes after applying:
   ```tsx
   queryClient.invalidateQueries({ queryKey: ['governmentPrograms'] })
   ```

---

## Step 5 — Update navigation everywhere else

| File | Line | Change |
|---|---|---|
| `app/(seeker)/_layout.tsx` | 83 | `<Tabs.Screen name="upskill-hub" …>` → `name="government-programs"` |
| `app/(seeker)/_layout.tsx` | 84 | `<Tabs.Screen name="upskill-hub/[id]" …>` → `name="government-programs/[id]"` |
| `app/(seeker)/index.tsx` | 273 | `label="Upskill Hub"` → `label="Government Programs"`; `router.push('/(seeker)/upskill-hub')` → `'/(seeker)/government-programs'` |
| `app/(seeker)/notifications.tsx` | 57 | `router.push(\`/(seeker)/upskill-hub/${…}\`)` → `\`/(seeker)/government-programs/${…}\`` |
| `app/(seeker)/program-applications.tsx` | 61 | `router.push('/(seeker)/upskill-hub')` → `'/(seeker)/government-programs'` |

> Tip: after the file renames, run a search for `upskill-hub` across the whole `i-peso-mobile` project — there should be **zero** hits left.

---

## Files touched (summary)
- `services/seekerService.ts` — types (`ProgramEligibility`, `GovernmentProgramsResponse`, `eligibility` field), method rename, delete `getRecommendedPrograms`.
- `components/EligibilityBadge.tsx` — **new**.
- `app/(seeker)/upskill-hub.tsx` → `app/(seeker)/government-programs.tsx` — rewired + eligibility badge.
- `app/(seeker)/upskill-hub/[id].tsx` → `app/(seeker)/government-programs/[id].tsx` — eligibility badge + breakdown.
- `app/(seeker)/_layout.tsx`, `index.tsx`, `notifications.tsx`, `program-applications.tsx` — nav links.

## Verification checklist
- [ ] `npx tsc --noEmit` (or the project's typecheck) passes — no references to `UpskillHubResponse` / `getUpskillHub` / `getRecommendedPrograms` remain.
- [ ] `grep -rn "upskill-hub" .` inside `i-peso-mobile` returns nothing.
- [ ] Open the app → the seeker home "Government Programs" quick action opens the list.
- [ ] List shows programs, each with a coloured eligibility badge (e.g. **Highly Eligible · 100%**).
- [ ] Tapping a program opens the detail with the **Your Eligibility** ✓/✗ breakdown.
- [ ] Apply flow still works; after applying, the list/detail refresh and show "You applied".
- [ ] The two bulletin cards still open Job Fairs and Citizen Charter.
- [ ] Tapping a program notification opens the correct detail screen.

## Backend reference (already done — do not change)
- Seeker list/detail attach eligibility via `EligibilityMatchingService` (`i-peso-backend/app/Services/EligibilityMatchingService.php`).
- Statuses & scoring: required rule fails → `not_eligible`; else `score = met_weight / total_weight × 100`; 100 → highly, 60–99 → partially, <60 → low match.
