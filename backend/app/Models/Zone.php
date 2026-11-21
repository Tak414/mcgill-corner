<?php

namespace App\Models;

use Database\Factories\ZoneFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Zone extends Model
{
    /** @use HasFactory<ZoneFactory> */
    use HasFactory;

    public $timestamps = false;

    public $incrementing = false;

    protected $keyType = 'int';

    protected $fillable = ['id', 'row', 'col', 'south', 'west', 'north', 'east', 'required_count', 'bonus_points'];

    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'row' => 'integer',
            'col' => 'integer',
            'south' => 'float',
            'west' => 'float',
            'north' => 'float',
            'east' => 'float',
            'required_count' => 'integer',
            'bonus_points' => 'integer',
        ];
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function progress(): HasMany
    {
        return $this->hasMany(ZoneProgress::class);
    }
}
