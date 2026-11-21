<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventRsvp;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class EventCodeIssuer
{
    public function issueFor(Event $event, int $userId): ?string
    {
        if ($event->codeWindow() !== 'open') {
            return null;
        }

        return DB::transaction(function () use ($event, $userId): ?string {
            Event::query()->whereKey($event->getKey())->lockForUpdate()->firstOrFail();
            $rsvp = EventRsvp::query()
                ->where('event_id', $event->id)
                ->where('user_id', $userId)
                ->lockForUpdate()
                ->first();

            if ($rsvp === null) {
                return null;
            }

            if ($rsvp->code !== null) {
                return $rsvp->code;
            }

            for ($attempt = 0; $attempt < 10_000; $attempt++) {
                $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
                $alreadyIssued = EventRsvp::query()
                    ->where('event_id', $event->id)
                    ->where('code', $code)
                    ->exists();

                if ($alreadyIssued) {
                    continue;
                }

                $rsvp->code = $code;
                $rsvp->save();

                return $code;
            }

            throw new RuntimeException('No unused event code is available.');
        });
    }
}
