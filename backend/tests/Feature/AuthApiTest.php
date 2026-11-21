<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuthApiTest extends TestCase
{
    public function test_legacy_versioned_and_user_routes_are_removed(): void
    {
        $this->postJson('/api/v1/auth/login', [])->assertNotFound();
        $this->getJson('/api/v1/profile')->assertNotFound();
        $this->getJson('/api/v1/interests')->assertNotFound();
        $this->getJson('/api/user')->assertNotFound();
    }
}
