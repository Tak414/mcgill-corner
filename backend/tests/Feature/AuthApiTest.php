<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_profile_and_returns_a_sanitized_bearer_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Taylor Student', 'email' => ' Taylor@Example.COM ',
            'password' => 'StrongPassword123!', 'password_confirmation' => 'StrongPassword123!',
        ]);

        $response->assertCreated()->assertJsonPath('success', true)->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonPath('data.user.email', 'taylor@example.com')->assertJsonMissingPath('data.user.password');
        $this->assertDatabaseHas('users', ['email' => 'taylor@example.com']);
        $this->assertDatabaseCount('profiles', 1);
        $this->assertNotSame('StrongPassword123!', User::firstOrFail()->password);
        $this->assertSame(1, Profile::count());
    }

    public function test_registration_validates_duplicate_email_and_password_confirmation(): void
    {
        User::factory()->create(['email' => 'student@example.com']);
        $payload = ['name' => 'Student', 'email' => 'STUDENT@example.com', 'password' => 'StrongPassword123!', 'password_confirmation' => 'wrong'];

        $this->postJson('/api/v1/auth/register', $payload)->assertUnprocessable()->assertJsonPath('success', false)->assertJsonStructure(['errors' => ['email', 'password']]);
    }

    public function test_registration_rejects_invalid_email_and_missing_password_confirmation(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Student', 'email' => 'not-an-email', 'password' => 'StrongPassword123!',
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['email', 'password']]);
    }

    public function test_login_uses_the_same_error_for_unknown_and_wrong_password(): void
    {
        User::factory()->create(['email' => 'student@example.com', 'password' => 'StrongPassword123!']);
        $wrongPassword = $this->postJson('/api/v1/auth/login', ['email' => 'student@example.com', 'password' => 'wrong'])->assertUnauthorized();
        $unknownEmail = $this->postJson('/api/v1/auth/login', ['email' => 'nobody@example.com', 'password' => 'wrong'])->assertUnauthorized();
        $this->assertSame($wrongPassword->json('message'), $unknownEmail->json('message'));
        $this->postJson('/api/v1/auth/login', ['email' => 'STUDENT@example.com', 'password' => 'StrongPassword123!'])
            ->assertOk()->assertJsonPath('success', true)->assertJsonPath('data.user.email', 'student@example.com');
    }

    public function test_login_requires_both_credentials(): void
    {
        $this->postJson('/api/v1/auth/login', [])->assertUnprocessable()
            ->assertJsonPath('success', false)->assertJsonStructure(['errors' => ['email', 'password']]);
    }

    public function test_logout_revokes_only_the_current_token(): void
    {
        $user = User::factory()->create();
        $firstToken = $user->createToken('first')->plainTextToken;
        $secondToken = $user->createToken('second')->plainTextToken;

        $this->withToken($firstToken)->postJson('/api/v1/auth/logout')->assertOk()->assertJsonPath('success', true);
        $this->assertDatabaseMissing('personal_access_tokens', ['name' => 'first']);
        $this->app['auth']->forgetGuards();
        $this->withToken($firstToken)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->withToken($secondToken)->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_protected_routes_require_a_bearer_token(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->getJson('/api/v1/profile')->assertUnauthorized();
        $this->getJson('/api/v1/profile/interests')->assertUnauthorized();
    }

    public function test_login_is_rate_limited_after_five_attempts(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'limited@example.com', 'password' => 'wrong'])->assertUnauthorized();
        }

        $this->postJson('/api/v1/auth/login', ['email' => 'limited@example.com', 'password' => 'wrong'])
            ->assertStatus(429)->assertJsonPath('success', false);
    }
}
