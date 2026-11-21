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

    /**
     * @return array{id: int, row: int, col: int}|null
     */
    public function locate(float $lat, float $lng): ?array
    {
        if ($lat < self::SOUTH || $lat > self::NORTH || $lng < self::WEST || $lng > self::EAST) {
            return null;
        }

        $row = min(self::ROWS - 1, max(0, (int) floor(($lat - self::SOUTH) / self::LATITUDE_STEP)));
        $col = min(self::COLS - 1, max(0, (int) floor(($lng - self::WEST) / self::LONGITUDE_STEP)));

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
