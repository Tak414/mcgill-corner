<?php

namespace App\Models;

use Database\Factories\NeighborhoodFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Neighborhood extends Model
{
    /** @use HasFactory<NeighborhoodFactory> */
    use HasFactory;

    protected $fillable = ['name', 'slug', 'description', 'difficulty', 'boundary'];

    public function explorationProgress(): HasMany
    {
        return $this->hasMany(UserExplorationProgress::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }
}
