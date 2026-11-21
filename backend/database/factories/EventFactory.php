<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'host_id' => User::factory()->host(),
            'title' => fake()->sentence(3),
            'description' => fake()->sentence(),
            'location_name' => fake()->company(),
            'address' => null,
            'lat' => 45.5048,
            'lng' => -73.5772,
            'zone_id' => Zone::factory(),
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHours(2),
        ];
    }
}
