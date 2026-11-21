<?php

namespace App\Models;

use Database\Factories\InterestFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Interest extends Model
{
    /** @use HasFactory<InterestFactory> */
    use HasFactory;

    protected $fillable = ['name', 'slug', 'category'];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }
}
