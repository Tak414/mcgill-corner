<?php

namespace Database\Seeders;

use App\Models\Zone;
use App\Services\ZoneGrid;
use Illuminate\Database\Seeder;

class ZoneSeeder extends Seeder
{
    public function run(ZoneGrid $grid): void
    {
        foreach ($grid->cells() as $cell) {
            Zone::query()->updateOrCreate(['id' => $cell['id']], $cell);
        }
    }
}
