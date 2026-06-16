# Implementation Guide - Education & Skills Improvements

## Quick Start

### Phase 1: Database & Backend (Pre-requisites)
```bash
# 1. Run migrations
php artisan migrate

# 2. Register service providers (if needed in AppServiceProvider)
# $this->app->singleton(SkillNormalizationService::class);
# $this->app->singleton(SkillRecommendationService::class);
# $this->app->singleton(EnhancedJobMatchingService::class);

# 3. Update routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/seeker/skill-recommendations', [SkillRecommendationController::class, 'getRecommendations']);
    Route::post('/seeker/skill-gap-analysis', [SkillRecommendationController::class, 'analyzeGaps']);
    Route::get('/seeker/learning-resources/{skill}', [SkillRecommendationController::class, 'getLearningResources']);
});
```

### Phase 2: Update SeekerController (Moderate Priority)
**File**: `i-peso-backend/app/Http/Controllers/Api/SeekerController.php`

Update the `saveStep5()` method to:
1. Handle proficiency levels in request validation
2. Normalize skill names before storage
3. Detect and warn about duplicates
4. Call `SkillNormalizationService::deduplicate()`
5. Store proficiency, years_of_experience, and relevance_score

```php
// In saveStep5() validation
'technical_skills' => ['nullable', 'array'],
'technical_skills.*.name' => ['required_with:technical_skills', 'string', 'max:255'],
'technical_skills.*.proficiency' => ['required_with:technical_skills', 'in:beginner,intermediate,advanced,expert'],
'technical_skills.*.years_of_experience' => ['nullable', 'integer', 'min:0'],
'soft_skills' => ['nullable', 'array'],
'soft_skills.*.name' => ['required_with:soft_skills', 'string', 'max:255'],
'soft_skills.*.proficiency' => ['required_with:soft_skills', 'in:beginner,intermediate,advanced,expert'],
```

Skill saving logic:
```php
$normalizer = app(SkillNormalizationService::class);

// Deduplicate and normalize
$technicalSkills = collect($validated['technical_skills'] ?? [])
    ->map(fn($skill) => [
        'name' => $skill['name'],
        'normalized_name' => $normalizer->normalize($skill['name']),
        'proficiency' => $skill['proficiency'] ?? 'intermediate',
        'years_of_experience' => $skill['years_of_experience'] ?? null,
        'relevance_score' => $normalizer->scoreRelevance($skill['name']),
        'is_verified' => false,
    ])
    ->unique('normalized_name')
    ->values();

foreach ($technicalSkills as $skillData) {
    $seeker->seekerSkills()->create([
        'skill_name' => $skillData['name'],
        'normalized_skill_name' => $skillData['normalized_name'],
        'skill_type' => 'technical',
        'proficiency' => $skillData['proficiency'],
        'years_of_experience' => $skillData['years_of_experience'],
        'relevance_score' => $skillData['relevance_score'],
        'is_verified' => false,
    ]);
}
```

### Phase 3: Frontend Integration (UI Update)
**File**: `i-peso-frontend/src/pages/auth/onboarding/SeekerOnboarding.jsx`

1. Import the new enhanced form component
2. Replace current Step 5 rendering with `<EnhancedStep5Form />`
3. Pass props for skill suggestions (fetch from backend if available)
4. Handle the new data structure (skills as objects with proficiency)

```jsx
// In SeekerOnboarding.jsx Step 5 rendering
import EnhancedStep5Form from '@/components/EnhancedStep5Form'

// In the step rendering
<EnhancedStep5Form
  form={form}
  errors={errors}
  onChange={onChange}
  onAddEducation={onAddEducation}
  onRemoveEducation={onRemoveEducation}
  onUpdateEducation={onUpdateEducation}
  skillSuggestions={skillSuggestions}
  onSkillsAnalysis={handleSkillAnalysis}
/>
```

### Phase 4: Frontend Services Update (Advanced)
**File**: `i-peso-frontend/src/services/seekerService.js`

Add new methods:
```javascript
export async function getSkillRecommendations() {
  const response = await apiClient.get('/seeker/skill-recommendations')
  return response.data.data ?? {}
}

export async function analyzeSkillGaps(requiredSkills) {
  const response = await apiClient.post('/seeker/skill-gap-analysis', {
    required_skills: requiredSkills,
  })
  return response.data.data ?? {}
}

export async function getLearningResources(skillName) {
  const response = await apiClient.get(`/seeker/learning-resources/${encodeURIComponent(skillName)}`)
  return response.data.resources ?? {}
}
```

### Phase 5: Testing & Validation

#### Backend Tests
```php
// Test SkillNormalizationService
test('normalizes skill names correctly', function () {
    $service = new SkillNormalizationService();
    expect($service->normalize('JavaScript'))->toBe('javascript');
    expect($service->normalize('C++'))->toBe('c plus plus');
});

test('detects duplicate skills', function () {
    $service = new SkillNormalizationService();
    expect($service->areDuplicates('JavaScript', 'JS'))->toBeTrue();
    expect($service->areDuplicates('Python', 'C++'))->toBeFalse();
});
```

#### Frontend Tests
Test the EnhancedStep5Form component:
- Duplicate detection on skill add
- Proficiency level selection
- Education expansion/collapse
- Skill removal
- Form submission

---

## Database Rollback Plan

If you need to rollback:
```bash
php artisan migrate:rollback

# Or specific migration
php artisan migrate:rollback --step=3
```

---

## Configuration Options

### Environment Variables (Optional)
```env
# .env
SKILL_MARKET_HOT_THRESHOLD=80
SKILL_RELEVANCE_THRESHOLD=60
SKILL_PROFICIENCY_WEIGHT_EXPERT=1.0
SKILL_PROFICIENCY_WEIGHT_ADVANCED=0.75
SKILL_PROFICIENCY_WEIGHT_INTERMEDIATE=0.5
SKILL_PROFICIENCY_WEIGHT_BEGINNER=0.25
```

---

## Performance Considerations

### Indexing
The migrations already add indexes on:
- `seeker_skills(seeker_id, proficiency)`
- `seeker_skills(proficiency)`
- `seeker_skills(normalized_skill_name)`
- `seeker_skills(relevance_score)`
- `seeker_skills(is_verified)`
- `seeker_educations(is_verified)`

### Caching (Future Enhancement)
Consider caching for:
- Skill catalog entries
- Recommendation results (5-minute TTL)
- Learning resources (24-hour TTL)

---

## Common Issues & Solutions

### Issue: Levenshtein distance function not available
**Solution**: PHP has built-in `levenshtein()` function, ensure PHP is updated

### Issue: Schema::hasColumn() throws error
**Solution**: Already wrapped in Schema::hasTable() check, should be safe

### Issue: Migration fails due to existing data
**Solution**: Migrations include fallback defaults:
- `proficiency` defaults to 'intermediate'
- `relevance_score` defaults to 50
- `is_verified` defaults to false

---

## Next Steps After Implementation

1. **Data Migration**: Populate existing seeker skills with proficiency levels
2. **A/B Testing**: Test enhanced scoring vs. old algorithm
3. **User Feedback**: Gather feedback on new form UX
4. **Analytics**: Track recommendation acceptance rates
5. **Optimization**: Fine-tune weights based on real-world matching results

---

## Support & Questions

For questions about implementation:
1. Check EDUCATION_SKILLS_IMPROVEMENTS.md for detailed explanation
2. Review code comments in service files
3. Check test files for usage examples
4. Refer to API responses in documentation

