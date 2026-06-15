# Philippine occupation aliases

`local_aliases.csv` contains reviewed Philippine, Filipino-language, informal,
and locally common job titles mapped to the active occupation catalog.

## Review workflow

1. Record unmatched searches, employer vacancy titles, job-fair titles, and
   common local terms in `local_alias_candidates.csv`.
2. Group duplicate terms and prioritize terms with the highest frequency.
3. Search the occupation catalog and select one existing canonical occupation.
4. Add only clear equivalents. Broad or ambiguous terms should resolve to a
   configured job family instead of creating a pending seeker record.
5. Copy approved mappings into `local_aliases.csv`.
6. Validate before importing:

   ```powershell
   php artisan occupations:import-aliases --validate-only --strict
   ```

7. Import only after validation reports zero missing titles and zero conflicts:

   ```powershell
   php artisan occupations:import-aliases --strict
   ```

## CSV fields

- `canonical_title`: Exact title of an active catalog occupation.
- `alias`: Local or alternative term a user may search.
- `language`: Usually `en` or `fil`.
- `source`: Use `local_peso` for reviewed PESO terminology.
- `confidence`: Use `1` for direct equivalents, `0.9-0.95` for strong common
  equivalents, and lower values only when the mapping still has a clear single
  meaning.

Do not map one ambiguous alias to multiple occupations. Do not create a new
canonical occupation when the term is only another name for an existing role.

## Generalized terms

`general_terms.csv` is for broad search phrases that intentionally return
multiple occupations, such as `driver`, `office work`, `factory worker`,
`healthcare work`, or `construction work`.

Validate and import generalized mappings with:

```powershell
php artisan occupations:import-general-terms --validate-only --strict
php artisan occupations:import-general-terms --strict
```

Use aliases for one-to-one equivalents. Use generalized terms when the phrase
represents a family of occupations.

## Seeker occupation preferences

Job seekers select exact occupations from the unified local catalog. PSOC
occupations are preferred when available, ESCO supplies international and
specialized roles, and O*NET mappings and reported titles expand search aliases.
The selected catalog `occupation_id` is saved in `seeker_occupations`.

The search accepts exact titles, classification codes, reviewed local aliases,
and O*NET job titles. For example, `Accountant` selects the specific accountant
record, while `sekyu` resolves to the exact Security Guard occupation.

Resolution order:

1. Reviewed occupation-to-family mappings in `general_terms.csv`.
2. The occupation title and local aliases in the catalog.
3. The family's reviewed title patterns in `config/job_preferences.php`.

Add important occupations to `general_terms.csv`; these terms improve broad
search recall while still returning specific selectable occupation records.

Both seeker preferences and employer vacancies use specific catalog
occupations. Unmatched free text is not stored as a pending preference; the
seeker must choose an available standardized result.
