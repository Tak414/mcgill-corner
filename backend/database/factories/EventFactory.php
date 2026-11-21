<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\Neighborhood;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Event> */
class EventFactory extends Factory
{
    protected $model = Event::class;

    public function definition(): array
    {
        $startsAt = fake()->dateTimeBetween('+1 day', '+1 month');

        return [
            'organizer_id' => User::factory(),
            'neighborhood_id' => Neighborhood::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'location_name' => 'McGill campus',
            'location_point' => json_encode([
                'type' => 'Point',
                'coordinates' => [-73.5772, 45.5048],
            ]),
            'starts_at' => $startsAt,
            'ends_at' => (clone $startsAt)->modify('+2 hours'),
            'status' => 'published',
            'visibility' => 'university',
            'capacity' => fake()->numberBetween(10, 80),
        ];
    }
}
