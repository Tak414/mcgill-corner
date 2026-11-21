<?php

namespace Tests\Feature;

use App\Models\Interest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InterestApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_interests_are_publicly_listed_and_users_can_replace_their_selection(): void
    {
        $first = Interest::factory()->create(['name' => 'Art', 'category' => 'Arts']);
        $second = Interest::factory()->create(['name' => 'Climbing', 'category' => 'Sports']);
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->getJson('/api/v1/interests')->assertOk()->assertJsonPath('success', true)->assertJsonCount(2, 'data');
        $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile/interests', ['interests' => [$first->id]])
            ->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile/interests', ['interests' => [$second->id]])
            ->assertOk()->assertJsonPath('data.0.id', $second->id);

        $this->assertDatabaseMissing('interest_user', ['user_id' => $user->id, 'interest_id' => $first->id]);
        $this->assertDatabaseHas('interest_user', ['user_id' => $user->id, 'interest_id' => $second->id]);
        $this->assertDatabaseMissing('interest_user', ['user_id' => $other->id, 'interest_id' => $second->id]);
        $this->actingAs($user, 'sanctum')->getJson('/api/v1/profile/interests')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_interest_selection_rejects_duplicate_and_unknown_ids(): void
    {
        $interest = Interest::factory()->create();
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile/interests', ['interests' => [$interest->id, $interest->id]])->assertUnprocessable();
        $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile/interests', ['interests' => [999999]])->assertUnprocessable();
    }
}
