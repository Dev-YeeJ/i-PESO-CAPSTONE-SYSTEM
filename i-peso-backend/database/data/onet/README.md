# O*NET occupation data

The versioned directory contains the O*NET Database files used to enrich the
ESCO-backed occupation catalog:

- `occupation_data.xlsx`
- `job_titles.xlsx`
- `sample_reported_titles.xlsx`
- `software_skills.xlsx`
- `essential_skills.xlsx`
- `transferable_skills.xlsx`

Import O*NET 30.3 with:

```powershell
php artisan occupations:import-onet --onet-version=30.3
```

Use `--replace` after replacing the O*NET source workbooks with a new release.

Import the O*NET skill recommendation catalog with:

```powershell
php artisan skills:import-onet --onet-version=30.3 --replace
```

The same command also imports the reviewed generalized vocabulary in
`database/data/skills/general_skills.csv`. Its aliases improve autocomplete
for common wording while the API returns a single canonical skill name.

The importer also builds the relational skill taxonomy:

- reviewed aliases from `general_skills.csv`
- O*NET occupation-to-skill evidence
- weighted operational-tool relationships from `skill_clusters.csv`

Cluster rules deliberately require both an O*NET occupation code and one or
more O*NET software element IDs. This prevents tools that merely share a broad
software category from being treated as universal synonyms.

ESCO remains the canonical occupation catalog. The importer creates
deterministic O*NET-to-ESCO source mappings and adds linked O*NET job titles as
search aliases. Unmatched O*NET occupations are not activated automatically.

O*NET data is licensed under CC BY 4.0. Product surfaces using the data must
include the attribution required by the O*NET license:
https://www.onetcenter.org/license_db.html
