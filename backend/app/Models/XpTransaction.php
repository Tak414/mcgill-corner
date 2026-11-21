<?php

namespace App\Models;

use Database\Factories\XpTransactionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use InvalidArgumentException;

class XpTransaction extends Model
{
    /** @use HasFactory<XpTransactionFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $table = 'xp_transactions';

    protected $fillable = ['user_id', 'amount', 'reason', 'source_type', 'source_id', 'metadata'];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'source_id' => 'integer',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public static function award(User $user, int $amount, string $reason, ?string $sourceType = null, ?int $sourceId = null, array $metadata = []): self
    {
        if ($amount !== 0 && $user->xpBalance() + $amount < 0) {
            throw new InvalidArgumentException('XP balance cannot be negative.');
        }

        return $user->xpTransactions()->create([
            'amount' => $amount,
            'reason' => $reason,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'metadata' => $metadata,
        ]);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
