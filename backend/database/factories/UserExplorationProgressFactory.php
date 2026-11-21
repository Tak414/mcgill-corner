<?php

namespace Database\Factories;

use App\Models\Neighborhood;
use App\Models\User;
use App\Models\UserExplorationProgress;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<UserExplorationProgress> */
class UserExplorationProgressFactory extends Factory
{
    protected $model = UserExplorationProgress::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'neighborhood_id' => Neighborhood::factory(),
            'progress_percent' => fake()->randomFloat(2, 0, 100),
            'visit_count' => fake()->numberBetween(1, 20),
            'first_discovered_at' => fake()->dateTimeBetween('-1 month', '-1 week'),
            'last_visited_at' => fake()->dateTimeBetween('-1 week', 'now'),
        ];
    }
}
