<?php

namespace Tests\Unit;

use App\Services\ZoneGrid;
use PHPUnit\Framework\TestCase;

class ZoneGridTest extends TestCase
{
    public function test_mcgill_coordinates_map_to_zone_45(): void
    {
        $this->assertSame(['id' => 45, 'row' => 4, 'col' => 5], (new ZoneGrid)->locate(45.5048, -73.5772));
        $this->assertSame(1, (new ZoneGrid)->cell(4, 5)['required_count']);
        $this->assertSame(200, (new ZoneGrid)->cell(4, 5)['bonus_points']);
    }

    public function test_southwest_corner_maps_to_zone_zero_and_outer_ring_costs_five(): void
    {
        $this->assertSame(['id' => 0, 'row' => 0, 'col' => 0], (new ZoneGrid)->locate(45.44, -73.68));
        $this->assertSame(5, (new ZoneGrid)->cell(0, 0)['required_count']);
    }

    public function test_northeast_corner_clamps_to_zone_ninety_nine(): void
    {
        $this->assertSame(['id' => 99, 'row' => 9, 'col' => 9], (new ZoneGrid)->locate(45.58, -73.50));
        $this->assertSame(5, (new ZoneGrid)->cell(9, 9)['required_count']);
    }

    public function test_coordinates_outside_the_grid_have_no_zone(): void
    {
        $this->assertNull((new ZoneGrid)->locate(45.60, -73.70));
    }

    public function test_grid_contains_exactly_one_hundred_cells(): void
    {
        $this->assertCount(100, (new ZoneGrid)->cells());
    }
}
