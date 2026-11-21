<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventRsvp;
use App\Models\Exchange;
use App\Services\EventCodeIssuer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventRsvpController extends Controller
{
    public function store(Request $request, Event $event, EventCodeIssuer $codeIssuer): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'attendee') {
            throw new ApiException('FORBIDDEN_ROLE', "Your account type can't do this.");
        }

        if ($event->codeWindow() === 'closed') {
            throw new ApiException('EVENT_ENDED', 'This event has ended.');
        }

        DB::transaction(fn (): EventRsvp => EventRsvp::query()->firstOrCreate([
            'event_id' => $event->id,
            'user_id' => $user->id,
        ], ['code' => null]));

        $code = $codeIssuer->issueFor($event, (int) $user->id);
        $codeWindow = $event->codeWindow();

        return response()->json([
            'going_count' => EventRsvp::query()->where('event_id', $event->id)->count(),
            'code_window' => $codeWindow,
            'my_code' => $codeWindow === 'open' ? $code : null,
        ]);
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'attendee') {
            throw new ApiException('FORBIDDEN_ROLE', "Your account type can't do this.");
        }

        $rsvp = EventRsvp::query()->where('event_id', $event->id)->where('user_id', $user->id)->first();

        if ($rsvp === null) {
            throw new ApiException('NOT_GOING', 'You are not going to this event.');
        }

        $hasCompletedExchange = Exchange::query()
            ->where('event_id', $event->id)
            ->whereNotNull('completed_at')
            ->where(fn ($query) => $query->where('user_low_id', $user->id)->orWhere('user_high_id', $user->id))
            ->exists();

        if ($hasCompletedExchange) {
            throw new ApiException('CANNOT_CANCEL', "You already met someone here, so you can't cancel.");
        }

        DB::transaction(function () use ($event, $rsvp, $user): void {
            Exchange::query()
                ->where('event_id', $event->id)
                ->whereNull('completed_at')
                ->where(fn ($query) => $query->where('user_low_id', $user->id)->orWhere('user_high_id', $user->id))
                ->delete();
            $rsvp->delete();
        });

        return response()->json([
            'going_count' => EventRsvp::query()->where('event_id', $event->id)->count(),
        ]);
    }
}
