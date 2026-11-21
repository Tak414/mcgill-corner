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

    protected $table = 'rsvps';

    public $timestamps = false;

    protected $fillable = ['event_id', 'user_id', 'code'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
