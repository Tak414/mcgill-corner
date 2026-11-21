<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Zone;
use App\Models\ZoneProgress;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ZoneProgress>
 */
class ZoneProgressFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'zone_id' => Zone::factory(),
            'exchange_count' => 0,
            'unlocked_at' => null,
        ];
    }
}
