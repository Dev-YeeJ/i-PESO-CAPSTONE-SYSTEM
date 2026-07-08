# QA Batch 02 — Seeker NSRP Onboarding, Profile, Credentials, AI Summary, and Resume

## Goal

Prove that onboarding and Profile Update share a coherent data contract, preserve conditional information, and produce a complete employer-ready profile without privacy or file-ownership defects.

## Preconditions

- Verified incomplete Seeker A and separate Seeker B.
- Occupation and skill catalogs imported.
- Valid/invalid sample PNG/JPEG/PDF files, including oversized and unsafe types.
- AI configured account plus a fallback/unavailable-AI run.

## Flow

`Verified account -> Steps 1–7 -> Completed profile -> Profile Update -> AI summary -> Photo/certificates -> Resume`

## Test cases

| ID | Scenario / action | Expected result |
|---|---|---|
| SKP-001 | Enter onboarding as verified incomplete seeker | Step state loads without missing-table/API errors |
| SKP-002 | Reload or return during onboarding | Previously saved step data and correct active step restore |
| SKP-003 | Step 1 valid personal and contact information | Data persists and normalization is visible after reload |
| SKP-004 | Step 1 date of birth below minimum age | Submission blocked with DOB-specific error |
| SKP-005 | Step 1 select disability `Other` without detail | Detail becomes required; hidden value is not silently accepted |
| SKP-006 | Step 1 valid special categories and household ID | Conditional fields persist with correct masked format |
| SKP-007 | Step 2 employed, unemployed, student, OFW branches | Only relevant conditional fields appear and save |
| SKP-008 | Toggle employment branch after entering conditional values | Stale incompatible values are cleared or deliberately preserved per contract |
| SKP-009 | Step 3 search exact occupation | Standard catalog result is selectable and ID persists |
| SKP-010 | Step 3 search alias/local term | Correct canonical occupation appears with understandable label |
| SKP-011 | Step 3 enter custom unmapped title | It is captured for review without pretending to be verified taxonomy |
| SKP-012 | Step 3 select 1 then 3 preferred occupations | Minimum and maximum rules work; ordering persists |
| SKP-013 | Step 3 attempt duplicate occupation | Duplicate chip/row is prevented |
| SKP-014 | Step 3 local work location with up to 3 places | PSGC/location values persist accurately |
| SKP-015 | Step 3 overseas work preference | Country choices appear, deduplicate case-insensitively and persist |
| SKP-016 | Step 4 choose Philippine language/dialect capabilities | Speak/read/write/understand values persist correctly |
| SKP-017 | Step 4 choose `Other` language without name | Submission is blocked at the missing name |
| SKP-018 | Step 5 add valid completed education | Level, course, school, year and status persist |
| SKP-019 | Step 5 undergraduate/currently studying paths | Required year/grade/program logic matches the chosen status |
| SKP-020 | Step 5 duplicate education record | Duplicate is rejected with actionable feedback |
| SKP-021 | Step 5 impossible year range or graduated-undergraduate conflict | Invalid combination is rejected |
| SKP-022 | Step 5 search/select hard skill | Canonical skill appears only in Hard Skills and persists |
| SKP-023 | Step 5 search/select soft skill | Canonical skill appears only in Soft Skills and persists |
| SKP-024 | Add same skill using case/alias variants | Deduplicated to one canonical record |
| SKP-025 | Add custom skill | User-facing value persists while source metadata stays hidden |
| SKP-026 | Save Step 5 with no skill | Minimum one-skill rule is clearly enforced |
| SKP-027 | Step 6 add training with institution and dates | Data persists and invalid date order is rejected |
| SKP-028 | Step 6 add eligibility/license | Name, rating/date/expiry metadata persist correctly |
| SKP-029 | Step 7 submit no work history | Optional empty state completes successfully |
| SKP-030 | Step 7 add current and previous work records | Exact dates, occupation, company, status and description persist |
| SKP-031 | Complete all required steps | `profile_completed` changes and dashboard becomes accessible |
| SKP-032 | Open Profile Update | All onboarding-backed fields appear with the same meanings and options |
| SKP-033 | Change occupation, skills, education and work history in Profile Update | Updates persist and are reflected on profile/dashboard/matching |
| SKP-034 | Trigger backend 422 from a nested Profile Update field | Correct section opens and field error maps to the right record |
| SKP-035 | Upload valid square profile image | Preview, persistence, replacement and authenticated retrieval work |
| SKP-036 | Upload non-image, malformed or oversized photo | Rejected without orphan file or broken profile state |
| SKP-037 | Upload valid private certificate with complete metadata | Record persists; owner can view/download; metadata is shown |
| SKP-038 | Certificate invalid date, unsafe type, oversized file or foreign training ID | Rejected; no database row or orphan file remains |
| SKP-039 | Seeker B requests Seeker A photo/certificate | Access denied with no path/metadata leak |
| SKP-040 | Generate AI summary with rich education, skills and experience | Output uses available facts, varies appropriately, and invents nothing |
| SKP-041 | Generate AI summary with sparse profile or unavailable AI | Honest fallback/guidance; no repeated fabricated template and no crash |
| SKP-042 | Generate resume with required photo and summary, then without each | Valid case returns readable A4 PDF; missing prerequisites give field-specific guidance |

## Batch exit criteria

- No lost profile data, missing relation/table error, cross-seeker file access, or inconsistent onboarding/Profile Update field contract.
- AI text must be factual, editable, varied by profile context, and safe under service failure.
- Resume regression is fixed and the complete PDF test passes.
