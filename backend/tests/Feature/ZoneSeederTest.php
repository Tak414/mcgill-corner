<?php

namespace Tests\Feature;

use App\Models\Zone;
use Database\Seeders\ZoneSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ZoneSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_zone_seeder_creates_exactly_one_hundred_cells(): void
    {
        $this->seed(ZoneSeeder::class);

        $this->assertDatabaseCount('zones', 100);
        $this->assertSame(range(0, 99), Zone::query()->orderBy('id')->pluck('id')->all());
        $this->assertDatabaseHas('zones', [
            'id' => 45,
            'row' => 4,
            'col' => 5,
            'required_count' => 1,
            'bonus_points' => 200,
        ]);
    }
}
