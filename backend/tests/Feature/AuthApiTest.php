<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_returns_the_contract_user_and_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Tak',
            'email' => 'tak@example.com',
            'password' => 'password123',
            'role' => 'attendee',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'role', 'points']])
            ->assertJsonPath('user.name', 'Tak')
            ->assertJsonPath('user.role', 'attendee')
            ->assertJsonPath('user.points', 0)
            ->assertJsonMissingPath('user.password');
        $this->assertDatabaseHas('users', ['email' => 'tak@example.com', 'role' => 'attendee', 'points' => 0]);
        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->assertNotSame('password123', User::query()->firstOrFail()->password);
    }

    public function test_registration_rejects_duplicate_email_and_invalid_role_with_contract_errors(): void
    {
        User::factory()->create(['email' => 'tak@example.com']);

        $this->postJson('/api/register', [
            'name' => 'Tak', 'email' => 'tak@example.com', 'password' => 'password123', 'role' => 'admin',
        ])->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure(['error' => ['code', 'message', 'fields' => ['email', 'role']]]);
    }

    public function test_login_returns_a_token_and_uses_generic_unauthenticated_errors(): void
    {
        User::factory()->create(['email' => 'tak@example.com', 'password' => 'password123']);

        $this->postJson('/api/login', ['email' => 'tak@example.com', 'password' => 'password123'])
            ->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'name', 'role', 'points']]);
        $wrongPassword = $this->postJson('/api/login', ['email' => 'tak@example.com', 'password' => 'wrong'])->assertUnauthorized();
        $unknownEmail = $this->postJson('/api/login', ['email' => 'nobody@example.com', 'password' => 'wrong'])->assertUnauthorized();
        $wrongPassword->assertJsonPath('error.code', 'UNAUTHENTICATED')->assertJsonPath('error.message', 'Please log in.');
        $this->assertSame($wrongPassword->json('error.message'), $unknownEmail->json('error.message'));
    }

    public function test_login_requires_credentials_and_returns_validation_error_fields(): void
    {
        $this->postJson('/api/login', [])->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure(['error' => ['fields' => ['email', 'password']]]);
    }

    public function test_logout_revokes_only_the_current_sanctum_token(): void
    {
        $user = User::factory()->create();
        $currentToken = $user->createToken('current')->plainTextToken;
        $user->createToken('other');

        $this->withToken($currentToken)->postJson('/api/logout')->assertNoContent();
        $this->assertDatabaseMissing('personal_access_tokens', ['name' => 'current']);
        $this->assertDatabaseHas('personal_access_tokens', ['name' => 'other']);
    }

    public function test_protected_logout_returns_the_contract_unauthenticated_error(): void
    {
        $this->postJson('/api/logout')->assertUnauthorized()
            ->assertJsonPath('error.code', 'UNAUTHENTICATED')
            ->assertJsonPath('error.message', 'Please log in.');
    }

    public function test_legacy_v1_routes_are_removed_and_api_404_uses_contract_error(): void
    {
        $this->getJson('/api/v1/profile')->assertNotFound();
        $this->getJson('/api/v1/interests')->assertNotFound();
        $this->getJson('/api/user')->assertNotFound();
        $this->getJson('/api/missing')->assertNotFound()
            ->assertJsonPath('error.code', 'NOT_FOUND')
            ->assertJsonPath('error.message', 'Event not found.');
    }

    public function test_cors_allows_the_contract_local_frontend_origin(): void
    {
        $this->options('/api/login', [], [
            'Origin' => 'http://localhost:5173',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'authorization,content-type',
        ])->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
            ->assertHeaderContains('Access-Control-Allow-Methods', 'POST');
    }

    public function test_cors_does_not_reflect_unconfigured_origins(): void
    {
        $this->options('/api/login', [], [
            'Origin' => 'https://unapproved.example',
            'Access-Control-Request-Method' => 'POST',
        ])->assertNoContent()->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }
}
