<?php

namespace Database\Factories;

use App\Models\Interest;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Interest> */
class InterestFactory extends Factory
{
    protected $model = Interest::class;

    public function definition(): array
    {
        $name = fake()->unique()->word();

        return [
            'name' => ucfirst($name),
            'slug' => Str::slug($name),
            'category' => fake()->randomElement(['Academic', 'Sports', 'Arts', 'Social']),
        ];
    }
}
