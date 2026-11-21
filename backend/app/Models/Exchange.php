<?php

namespace App\Models;

use Database\Factories\ExchangeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Exchange extends Model
{
    /** @use HasFactory<ExchangeFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'event_id', 'user_low_id', 'user_high_id', 'low_confirmed', 'high_confirmed',
        'completed_at', 'low_points_gained', 'high_points_gained', 'low_unlocked_now', 'high_unlocked_now',
    ];

    protected function casts(): array
    {
        return [
            'low_confirmed' => 'boolean',
            'high_confirmed' => 'boolean',
            'completed_at' => 'datetime',
            'low_points_gained' => 'integer',
            'high_points_gained' => 'integer',
            'low_unlocked_now' => 'boolean',
            'high_unlocked_now' => 'boolean',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function lowUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_low_id');
    }

    public function highUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_high_id');
    }
}
