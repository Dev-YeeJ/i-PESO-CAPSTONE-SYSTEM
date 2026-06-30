<?php
$skills = App\Models\SeekerSkill::whereNull('skill_id')->get();
foreach($skills as $skill) {
    $randomSkill = App\Models\Skill::inRandomOrder()->first();
    if ($randomSkill) {
        $skill->update(['skill_id' => $randomSkill->id]);
    }
}

$vacancies = App\Models\JobVacancy::doesntHave('skillRequirements')->get();
foreach($vacancies as $vacancy) {
    $skills = App\Models\Skill::inRandomOrder()->take(5)->get();
    foreach($skills as $skill) {
        App\Models\JobVacancySkill::create([
            'post_id' => $vacancy->post_id,
            'skill_id' => $skill->id,
            'skill_type' => 'technical',
            'original_name' => $skill->name,
            'weight' => 20
        ]);
    }
}
echo "Done fixing skills!\n";
