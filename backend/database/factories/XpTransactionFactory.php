<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\XpTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<XpTransaction> */
class XpTransactionFactory extends Factory
{
    protected $model = XpTransaction::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'amount' => fake()->numberBetween(1, 100),
            'reason' => fake()->randomElement(['event_attendance', 'neighborhood_discovery', 'community_contribution']),
            'source_type' => null,
            'source_id' => null,
            'metadata' => [],
        ];
    }
}
