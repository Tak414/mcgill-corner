<?php

namespace App\Models;

use Database\Factories\EventRsvpFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventRsvp extends Model
{
    /** @use HasFactory<EventRsvpFactory> */
    use HasFactory;

    protected $table = 'event_rsvps';

    protected $fillable = ['user_id', 'event_id', 'status', 'responded_at'];

    protected function casts(): array
    {
        return ['responded_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
