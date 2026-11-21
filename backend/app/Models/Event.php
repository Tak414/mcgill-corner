<?php

namespace App\Models;

use Database\Factories\EventFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class Event extends Model
{
    /** @use HasFactory<EventFactory> */
    use HasFactory;

    protected $fillable = [
        'organizer_id',
        'neighborhood_id',
        'title',
        'description',
        'location_name',
        'location_point',
        'starts_at',
        'ends_at',
        'status',
        'visibility',
        'capacity',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'capacity' => 'integer',
        ];
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function neighborhood(): BelongsTo
    {
        return $this->belongsTo(Neighborhood::class);
    }

    public function rsvps(): HasMany
    {
        return $this->hasMany(EventRsvp::class);
    }

    public function attendees(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(User::class, 'event_rsvps')
            ->withPivot('status', 'responded_at')
            ->withTimestamps();
    }

    public function scopeNear(Builder $query, float $longitude, float $latitude, float $radiusMeters = 5000): Builder
    {
        if (DB::getDriverName() === 'pgsql') {
            return $query->whereRaw(
                'ST_DWithin(location_point, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)',
                [$longitude, $latitude, $radiusMeters]
            );
        }

        $latitudeDegrees = $radiusMeters / 111320;
        $longitudeDegrees = $radiusMeters / (111320 * max(0.01, cos(deg2rad($latitude))));

        $west = number_format($longitude - $longitudeDegrees, 8, '.', '');
        $east = number_format($longitude + $longitudeDegrees, 8, '.', '');
        $south = number_format($latitude - $latitudeDegrees, 8, '.', '');
        $north = number_format($latitude + $latitudeDegrees, 8, '.', '');

        return $query->whereRaw(
            "json_extract(location_point, \"$.coordinates[0]\") BETWEEN {$west} AND {$east}"
        )->whereRaw(
            "json_extract(location_point, \"$.coordinates[1]\") BETWEEN {$south} AND {$north}"
        );
    }
}
