<?php

namespace App\Services;

final class ZoneGrid
{
    public const SOUTH = 45.44;

    public const WEST = -73.68;

    public const NORTH = 45.58;

    public const EAST = -73.50;

    public const ROWS = 10;

    public const COLS = 10;

    public const LATITUDE_STEP = 0.014;

    public const LONGITUDE_STEP = 0.018;

    private const LATITUDE_SCALE = 1_000_000;

    private const SOUTH_MICRODEGREES = 45_440_000;

    private const NORTH_MICRODEGREES = 45_580_000;

    private const WEST_MICRODEGREES = -73_680_000;

    private const EAST_MICRODEGREES = -73_500_000;

    private const LATITUDE_CELL_MICRODEGREES = 14_000;

    private const LONGITUDE_CELL_MICRODEGREES = 18_000;

    /**
     * @return array{id: int, row: int, col: int}|null
     */
    public function locate(float $lat, float $lng): ?array
    {
        $latMicrodegrees = (int) round($lat * self::LATITUDE_SCALE);
        $lngMicrodegrees = (int) round($lng * self::LATITUDE_SCALE);

        $inside = $latMicrodegrees >= self::SOUTH_MICRODEGREES
            && $latMicrodegrees <= self::NORTH_MICRODEGREES
            && $lngMicrodegrees >= self::WEST_MICRODEGREES
            && $lngMicrodegrees <= self::EAST_MICRODEGREES;

        if (! $inside) {
            return null;
        }

        $row = min(self::ROWS - 1, intdiv($latMicrodegrees - self::SOUTH_MICRODEGREES, self::LATITUDE_CELL_MICRODEGREES));
        $col = min(self::COLS - 1, intdiv($lngMicrodegrees - self::WEST_MICRODEGREES, self::LONGITUDE_CELL_MICRODEGREES));

        return ['id' => $row * self::COLS + $col, 'row' => $row, 'col' => $col];
    }

    /**
     * @return array{id: int, row: int, col: int, south: float, west: float, north: float, east: float, required_count: int, bonus_points: int}
     */
    public function cell(int $row, int $col): array
    {
        $south = self::SOUTH + ($row * self::LATITUDE_STEP);
        $west = self::WEST + ($col * self::LONGITUDE_STEP);
        $ring = max(abs($row - 4), abs($col - 5));
        $requiredCount = min(5, max(1, $ring));

        return [
            'id' => $row * self::COLS + $col,
            'row' => $row,
            'col' => $col,
            'south' => $south,
            'west' => $west,
            'north' => $south + self::LATITUDE_STEP,
            'east' => $west + self::LONGITUDE_STEP,
            'required_count' => $requiredCount,
            'bonus_points' => $requiredCount * 200,
        ];
    }

    /**
     * @return list<array{id: int, row: int, col: int, south: float, west: float, north: float, east: float, required_count: int, bonus_points: int}>
     */
    public function cells(): array
    {
        $cells = [];

        for ($row = 0; $row < self::ROWS; $row++) {
            for ($col = 0; $col < self::COLS; $col++) {
                $cells[] = $this->cell($row, $col);
            }
        }

        return $cells;
    }
}
