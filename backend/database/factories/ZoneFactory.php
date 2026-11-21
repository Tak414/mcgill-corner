<?php

namespace Database\Factories;

use App\Models\Zone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Zone>
 */
class ZoneFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $id = fake()->unique()->numberBetween(0, 99);
        $row = intdiv($id, 10);
        $col = $id % 10;
        $south = 45.44 + ($row * 0.014);
        $west = -73.68 + ($col * 0.018);
        $ring = max(abs($row - 4), abs($col - 5));
        $requiredCount = min(5, max(1, $ring));

        return [
            'id' => $id,
            'row' => $row,
            'col' => $col,
            'south' => $south,
            'west' => $west,
            'north' => $south + 0.014,
            'east' => $west + 0.018,
            'required_count' => $requiredCount,
            'bonus_points' => $requiredCount * 200,
        ];
    }
}
