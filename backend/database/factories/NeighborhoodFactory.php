<?php

namespace Database\Factories;

use App\Models\Neighborhood;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Neighborhood> */
class NeighborhoodFactory extends Factory
{
    protected $model = Neighborhood::class;

    public function definition(): array
    {
        $name = fake()->unique()->city();

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => fake()->sentence(),
            'difficulty' => fake()->numberBetween(1, 3),
            'boundary' => json_encode([
                'type' => 'Polygon',
                'coordinates' => [[
                    [-73.58, 45.50],
                    [-73.57, 45.50],
                    [-73.57, 45.51],
                    [-73.58, 45.51],
                    [-73.58, 45.50],
                ]],
            ]),
        ];
    }
}
