<?php

namespace App\Models;

use Database\Factories\ZoneProgressFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ZoneProgress extends Model
{
    /** @use HasFactory<ZoneProgressFactory> */
    use HasFactory;

    protected $table = 'zone_progress';

    public $timestamps = false;

    protected $primaryKey = null;

    public $incrementing = false;

    protected $fillable = ['user_id', 'zone_id', 'exchange_count', 'unlocked_at'];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'zone_id' => 'integer',
            'exchange_count' => 'integer',
            'unlocked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }
}
