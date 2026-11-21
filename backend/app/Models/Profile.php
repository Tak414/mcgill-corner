<?php

namespace App\Models;

use Database\Factories\ProfileFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    /** @use HasFactory<ProfileFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'username',
        'bio',
        'university',
        'avatar_url',
        'friend_mode',
        'dating_mode',
        'visibility_settings',
    ];

    protected function casts(): array
    {
        return [
            'friend_mode' => 'boolean',
            'dating_mode' => 'boolean',
            'visibility_settings' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
