<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_read_and_update_only_their_own_profile(): void
    {
        $user = User::factory()->create();
        $profile = Profile::factory()->for($user)->create(['username' => 'first-user']);
        $other = User::factory()->create();
        $otherProfile = Profile::factory()->for($other)->create(['username' => 'other-user']);

        $this->actingAs($user, 'sanctum')->getJson('/api/v1/profile')->assertOk()
            ->assertJsonPath('data.profile.username', 'first-user')->assertJsonMissingPath('data.user_id');
        $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile', [
            'name' => 'Updated Name', 'username' => 'fresh-name', 'program' => 'Computer Science',
            'year_of_study' => 2, 'bio' => 'Hello campus', 'avatar_url' => 'https://example.com/avatar.png',
        ])->assertOk()->assertJsonPath('data.name', 'Updated Name')->assertJsonPath('data.profile.program', 'Computer Science');

        $this->assertDatabaseHas('profiles', ['id' => $profile->id, 'username' => 'fresh-name', 'year_of_study' => 2]);
        $this->assertDatabaseHas('profiles', ['id' => $otherProfile->id, 'username' => 'other-user']);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Updated Name']);
    }

    public function test_profile_rejects_protected_fields_and_duplicate_usernames(): void
    {
        $user = User::factory()->create();
        Profile::factory()->for($user)->create(['username' => 'my-profile']);
        $other = User::factory()->create();
        Profile::factory()->for($other)->create(['username' => 'taken-name']);

        $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile', ['username' => 'taken-name'])->assertUnprocessable();
        $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile', ['user_id' => $other->id, 'xp' => 999])->assertUnprocessable();
        $this->assertDatabaseHas('profiles', ['user_id' => $user->id, 'username' => 'my-profile']);
        $this->assertDatabaseMissing('profiles', ['user_id' => $user->id, 'username' => 'taken-name']);
    }

    public function test_profile_rejects_invalid_editable_values(): void
    {
        $user = User::factory()->create();
        Profile::factory()->for($user)->create();

        $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile', [
            'year_of_study' => 12, 'bio' => str_repeat('x', 241), 'avatar_url' => 'not-a-url',
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['year_of_study', 'bio', 'avatar_url']]);
    }
}
