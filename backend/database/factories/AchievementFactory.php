<?php

namespace Database\Factories;

use App\Models\Achievement;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Achievement> */
class AchievementFactory extends Factory
{
    protected $model = Achievement::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'code' => Str::slug($name, '_'),
            'name' => ucfirst($name),
            'description' => fake()->sentence(),
            'icon' => null,
            'xp_reward' => fake()->randomElement([25, 50, 75, 100]),
        ];
    }
}
