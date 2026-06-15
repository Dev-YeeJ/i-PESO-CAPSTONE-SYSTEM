<?php

namespace Tests\Feature;

use App\Services\XlsxTableReader;
use Tests\TestCase;

class OnetDataFilesTest extends TestCase
{
    public function test_repository_contains_readable_onet_30_3_source_files(): void
    {
        $reader = app(XlsxTableReader::class);
        $directory = database_path('data/onet/v30.3');

        $occupationRows = iterator_to_array($reader->rows($directory.'/occupation_data.xlsx'));
        $jobTitleRows = iterator_to_array($reader->rows($directory.'/job_titles.xlsx'));
        $reportedRows = iterator_to_array($reader->rows($directory.'/sample_reported_titles.xlsx'));
        $softwareSkillRows = iterator_to_array($reader->rows($directory.'/software_skills.xlsx'));
        $essentialSkillRows = iterator_to_array($reader->rows($directory.'/essential_skills.xlsx'));
        $transferableSkillRows = iterator_to_array($reader->rows($directory.'/transferable_skills.xlsx'));

        $this->assertCount(1016, $occupationRows);
        $this->assertCount(57543, $jobTitleRows);
        $this->assertCount(7953, $reportedRows);
        $this->assertCount(31821, $softwareSkillRows);
        $this->assertCount(17880, $essentialSkillRows);
        $this->assertCount(44700, $transferableSkillRows);

        $this->assertArrayHasKey('O*NET-SOC Code', $occupationRows[0]);
        $this->assertArrayHasKey('Title', $occupationRows[0]);
        $this->assertArrayHasKey('Description', $occupationRows[0]);
        $this->assertArrayHasKey('Job Title', $jobTitleRows[0]);
        $this->assertArrayHasKey('Reported Job Title', $reportedRows[0]);
        $this->assertArrayHasKey('Workplace Example', $softwareSkillRows[0]);
        $this->assertArrayHasKey('Element Name', $essentialSkillRows[0]);
        $this->assertArrayHasKey('Element Name', $transferableSkillRows[0]);
    }

    public function test_general_skill_vocabulary_has_broad_unique_coverage(): void
    {
        $path = database_path('data/skills/general_skills.csv');
        $handle = fopen($path, 'rb');
        $this->assertNotFalse($handle);

        $headers = fgetcsv($handle);
        $this->assertSame(['category', 'name', 'aliases'], $headers);

        $rows = [];
        while (($values = fgetcsv($handle)) !== false) {
            $row = array_combine($headers, $values);
            $this->assertNotFalse($row);
            $rows[] = $row;
        }
        fclose($handle);

        $this->assertGreaterThanOrEqual(100, count($rows));
        $this->assertGreaterThanOrEqual(60, collect($rows)->where('category', 'technical')->count());
        $this->assertGreaterThanOrEqual(35, collect($rows)->where('category', 'soft')->count());
        $this->assertSame(
            count($rows),
            collect($rows)->map(fn (array $row) => $row['category'].'|'.mb_strtolower($row['name']))->unique()->count()
        );
    }
}
