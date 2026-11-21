<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\Exchange;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Exchange>
 */
class ExchangeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'user_low_id' => User::factory(),
            'user_high_id' => User::factory(),
            'low_confirmed' => false,
            'high_confirmed' => false,
            'completed_at' => null,
            'low_points_gained' => 0,
            'high_points_gained' => 0,
            'low_unlocked_now' => false,
            'high_unlocked_now' => false,
        ];
    }
}
