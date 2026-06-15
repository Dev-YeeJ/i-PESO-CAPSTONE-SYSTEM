# ESCO Occupation Data

The application uses the English ESCO occupation classification as its broad
occupation vocabulary while an official Philippine PSOC source is unavailable.

## Included snapshot

- Dataset: ESCO classification
- Version: 1.2.1
- Language: English
- File: `v1.2.1/occupations_en.csv`
- Source: https://esco.ec.europa.eu/en/use-esco/download
- Last official update: December 10, 2025

The CSV is retained in the repository so development, testing, and production
can import the same taxonomy version.

## Import

From `i-peso-backend`:

```powershell
php artisan migrate
php artisan occupations:import-esco --esco-version=1.2.1 --deactivate-missing
```

The importer is repeatable. Existing ESCO records are updated by their stable
concept URI, and records missing from a replacement snapshot are deactivated
when `--deactivate-missing` is used.

## Local aliases and additional sources

ESCO remains the base catalog. Philippine terms and common informal job titles
are stored separately as aliases so the canonical occupation is not duplicated:

```powershell
php artisan occupations:import-aliases
```

The default alias file is `database/data/occupations/local_aliases.csv`.
Additional PSOC and O*NET importers should map their codes through
`occupation_source_mappings`, while occupation-linked skills can be stored in
`occupation_skills`.

Seeker onboarding stores only a recognized catalog occupation or configured
broad job family. Unmatched text remains a search phrase and is not saved as a
pending occupation.

## Attribution

ESCO is developed by the European Commission. Unless otherwise indicated,
European Commission content is available under the Creative Commons
Attribution 4.0 International licence.

See:

- https://esco.ec.europa.eu/
- https://commission.europa.eu/legal-notice_en
