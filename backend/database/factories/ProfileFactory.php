<?php

namespace Database\Factories;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Profile> */
class ProfileFactory extends Factory
{
    protected $model = Profile::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'username' => fake()->unique()->userName(),
            'bio' => fake()->sentence(),
            'university' => 'McGill University',
            'avatar_url' => null,
            'friend_mode' => true,
            'dating_mode' => false,
            'visibility_settings' => ['discoverable' => true],
        ];
    }
}
