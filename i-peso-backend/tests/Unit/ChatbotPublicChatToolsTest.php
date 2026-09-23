<?php

namespace Tests\Unit;

use App\Models\Employer;
use App\Models\JobSeeker;
use App\Services\Chatbot\PublicChatTools;
use Tests\TestCase;

class ChatbotPublicChatToolsTest extends TestCase
{
    public function test_guest_receives_only_public_tools(): void
    {
        $names = collect((new PublicChatTools())->declarations())->pluck('name');

        $this->assertFalse($names->contains('get_my_seeker_activity'));
        $this->assertFalse($names->contains('get_my_employer_workspace'));
        $this->assertTrue($names->contains('search_job_vacancies'));
    }

    public function test_private_tools_are_role_specific(): void
    {
        $tools = new PublicChatTools();

        $seekerNames = collect($tools->declarations(new JobSeeker()))->pluck('name');
        $employerNames = collect($tools->declarations(new Employer()))->pluck('name');

        $this->assertTrue($seekerNames->contains('get_my_seeker_activity'));
        $this->assertFalse($seekerNames->contains('get_my_employer_workspace'));
        $this->assertTrue($employerNames->contains('get_my_employer_workspace'));
        $this->assertFalse($employerNames->contains('get_my_seeker_activity'));
    }

    public function test_private_tool_rejects_a_wrong_role(): void
    {
        $result = (new PublicChatTools())->execute('get_my_seeker_activity', [], new Employer());

        $this->assertStringContainsString('only available to the authenticated job seeker', $result['error']);
    }

    public function test_tool_arguments_are_bounded_and_non_strings_are_normalized(): void
    {
        $method = new \ReflectionMethod(PublicChatTools::class, 'safeString');
        $method->setAccessible(true);

        $this->assertSame('', $method->invoke(new PublicChatTools(), ['drop' => 'table']));
        $this->assertSame(100, strlen($method->invoke(new PublicChatTools(), str_repeat('x', 200))));
    }
}