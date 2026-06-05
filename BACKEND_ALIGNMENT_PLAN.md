# Step 5 Backend & Database Alignment with Frontend

## Current Issues

1. **Database Mismatch**: The frontend now uses separate arrays (`dole_skills`, `technical_skills`, `soft_skills`) but backend stores all skills in a single `seeker_skills` table with `skill_type` enum
2. **PDF Rendering**: The template looks for `other_skills` JSON field on JobSeeker but skills are in SeekerSkill table
3. **API Payload**: The current saveStep5() expects object array but receives flat strings from frontend

## Comprehensive Solution

### Architecture Changes

```
FRONTEND (Step5Component):
├── form.dole_skills = ["Auto Mechanic", "Carpentry Work"]        // Array of strings
├── form.technical_skills = ["React", "Data Analysis"]             // Array of strings
└── form.soft_skills = ["Leadership", "Communication"]             // Array of strings

↓ POST /api/seeker/step-5

BACKEND API (SeekerController.saveStep5()):
├── Validate & sanitize all three arrays
├── Delete existing skills (SeekerSkill records)
└── Re-insert each as individual SeekerSkill records with:
    ├── skill_name (string)
    ├── skill_type (enum: 'dole_standard' | 'technical' | 'soft')
    └── seeker_id (FK)

↓ Database (seeker_skills table):
├── id | seeker_id | skill_name | skill_type | created_at | updated_at
├── 1  | 123      | Auto Mechanic | dole_standard | ...
├── 2  | 123      | Carpentry Work | dole_standard | ...
├── 3  | 123      | React | technical | ...
└── 4  | 123      | Leadership | soft | ...

↓ Admin PDF Export:
├── Query SeekerSkill records grouped by skill_type
├── Render three separate sections:
│  ├── DOLE Skills (checkboxes checked)
│  ├── Technical/Professional Skills (custom list)
│  └── Soft Skills (custom list)
└── Download as PDF matching official NSRP Form layout
```

## Implementation Steps

### 1. Update Backend API (SeekerController.saveStep5)
- ✅ Accept three separate arrays
- ✅ Validate each array independently
- ✅ Save all skills to SeekerSkill table with proper skill_type

### 2. Update PDF Template (nsrp-form.blade.php)
- ✅ Query skills grouped by type
- ✅ Render official NSRP form Section VIII properly
- ✅ Show all three skill categories

### 3. Update Admin Export
- ✅ Ensure proper skill filtering and rendering

### 4. Backward Compatibility
- ✅ Migration to handle existing data
- ✅ Support both old and new format during transition

---

## Files to Update

1. `i-peso-backend/app/Http/Controllers/Api/SeekerController.php` → saveStep5()
2. `i-peso-backend/resources/views/pdf/nsrp-form.blade.php` → Skills sections
3. `i-peso-backend/database/migrations/*.php` → Skill type enum values
4. `i-peso-frontend/src/pages/auth/onboarding/SeekerOnboarding.jsx` → Already done ✅

---

## API Contract (New)

**POST /api/seeker/step-5**

Request:
```json
{
  "currently_in_school": false,
  "educations": [
    { "level": "tertiary", "course_strand": "BS Computer Science", "year_graduated": 2023 }
  ],
  "dole_skills": ["Auto Mechanic", "Carpentry Work"],
  "technical_skills": ["React", "TypeScript", "Data Analysis"],
  "soft_skills": ["Leadership", "Communication", "Teamwork"]
}
```

Response:
```json
{
  "message": "Educational background and skills saved.",
  "user": { ... }
}
```

---

## NSRP Form Section VIII Layout

The official NSRP form shows:

```
VIII. OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE
☐ AUTO MECHANIC          ☐ ELECTRICIAN           ☐ PHOTOGRAPHY
☐ BEAUTICIAN             ☐ EMBROIDERY            ☐ PLUMBING
☐ CARPENTRY WORK         ☐ GARDENING             ☐ SEWING DRESSES
☐ COMPUTER LITERATE      ☐ MASONRY               ☐ STENOGRAPHY
☐ DOMESTIC CHORES        ☐ PAINTER/ARTIST        ☐ TAILORING
☐ DRIVER                 ☐ PAINTING JOBS         ☐ OTHERS:_________

[Custom Professional Skills section below - not in official form but added]
Technical/Professional Skills: React, Data Analysis, TypeScript
Soft/Interpersonal Skills: Leadership, Communication, Teamwork
```

