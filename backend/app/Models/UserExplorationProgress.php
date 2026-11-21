<?php

namespace App\Models;

use Database\Factories\UserExplorationProgressFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserExplorationProgress extends Model
{
    /** @use HasFactory<UserExplorationProgressFactory> */
    use HasFactory;

    protected $table = 'user_exploration_progress';

    protected $fillable = [
        'user_id',
        'neighborhood_id',
        'progress_percent',
        'visit_count',
        'first_discovered_at',
        'last_visited_at',
    ];

    protected function casts(): array
    {
        return [
            'progress_percent' => 'decimal:2',
            'visit_count' => 'integer',
            'first_discovered_at' => 'datetime',
            'last_visited_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function neighborhood(): BelongsTo
    {
        return $this->belongsTo(Neighborhood::class);
    }
}
