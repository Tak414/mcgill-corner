<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ExchangeCodeRequest;
use App\Models\Event;
use App\Models\EventRsvp;
use App\Models\Exchange;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ExchangeController extends Controller
{
    public function store(ExchangeCodeRequest $request, Event $event): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'attendee') {
            throw new ApiException('FORBIDDEN_ROLE', "Your account type can't do this.");
        }

        if ($event->codeWindow() !== 'open') {
            throw new ApiException('CODE_WINDOW_CLOSED', 'The event code window is closed.');
        }

        $callerRsvp = EventRsvp::query()->where('event_id', $event->id)->where('user_id', $user->id)->first();
        if ($callerRsvp === null) {
            throw new ApiException('NOT_GOING', "Press I'm going first.");
        }

        $partnerRsvp = EventRsvp::query()->where('event_id', $event->id)->where('code', $request->validated('code'))->first();
        if ($partnerRsvp === null) {
            throw new ApiException('INVALID_CODE', 'No one at this event has that code.');
        }

        if ((int) $partnerRsvp->user_id === (int) $user->id) {
            throw new ApiException('OWN_CODE', "That's your own code.");
        }

        $partner = $partnerRsvp->user;
        $lowId = min((int) $user->id, (int) $partner->id);
        $highId = max((int) $user->id, (int) $partner->id);
        $exchange = Exchange::query()->where('event_id', $event->id)
            ->where('user_low_id', $lowId)->where('user_high_id', $highId)->first();

        if ($exchange?->completed_at !== null) {
            throw new ApiException('ALREADY_EXCHANGED', 'You already met this person at this event.');
        }

        $zone = Zone::query()->findOrFail($event->zone_id);
        $result = DB::transaction(function () use ($event, $user, $lowId, $highId): array {
            DB::table('exchanges')->upsert([[
                'event_id' => $event->id,
                'user_low_id' => $lowId,
                'user_high_id' => $highId,
                'low_confirmed' => false,
                'high_confirmed' => false,
                'completed_at' => null,
                'low_points_gained' => 0,
                'high_points_gained' => 0,
                'low_unlocked_now' => false,
                'high_unlocked_now' => false,
            ]], ['event_id', 'user_low_id', 'user_high_id'], ['event_id']);

            $callerIsLow = (int) $user->id === $lowId;
            Exchange::query()->where('event_id', $event->id)
                ->where('user_low_id', $lowId)->where('user_high_id', $highId)
                ->update([$callerIsLow ? 'low_confirmed' : 'high_confirmed' => true]);

            $pair = Exchange::query()->where('event_id', $event->id)
                ->where('user_low_id', $lowId)->where('user_high_id', $highId)
                ->lockForUpdate()->firstOrFail();

            if ($pair->completed_at !== null) {
                throw new ApiException('ALREADY_EXCHANGED', 'You already met this person at this event.');
            }

            if (! $pair->low_confirmed || ! $pair->high_confirmed) {
                return ['status' => 'pending'];
            }

            $completedAt = now('UTC');
            $zone = Zone::query()->findOrFail($event->zone_id);
            $sideResults = [];
            foreach ([$lowId, $highId] as $id) {
                DB::table('users')->where('id', $id)->increment('points', 100);
                DB::table('zone_progress')->insertOrIgnore([
                    'user_id' => $id,
                    'zone_id' => $zone->id,
                    'exchange_count' => 0,
                    'unlocked_at' => null,
                ]);
                DB::table('zone_progress')->where('user_id', $id)->where('zone_id', $zone->id)->increment('exchange_count');
                $progress = DB::table('zone_progress')->where('user_id', $id)->where('zone_id', $zone->id)->first();
                $unlockedNow = $progress->unlocked_at === null && (int) $progress->exchange_count >= $zone->required_count;
                $bonus = $unlockedNow ? (int) $zone->bonus_points : 0;
                if ($unlockedNow) {
                    DB::table('zone_progress')->where('user_id', $id)->where('zone_id', $zone->id)->update(['unlocked_at' => $completedAt]);
                    DB::table('users')->where('id', $id)->increment('points', $bonus);
                }
                $sideResults[$id] = [
                    'points' => 100 + $bonus,
                    'unlocked_now' => $unlockedNow,
                    'exchange_count' => (int) $progress->exchange_count,
                    'unlocked' => $unlockedNow || $progress->unlocked_at !== null,
                ];
            }

            $pair->forceFill([
                'completed_at' => $completedAt,
                'low_points_gained' => $sideResults[$lowId]['points'],
                'high_points_gained' => $sideResults[$highId]['points'],
                'low_unlocked_now' => $sideResults[$lowId]['unlocked_now'],
                'high_unlocked_now' => $sideResults[$highId]['unlocked_now'],
            ])->save();

            return ['status' => 'completed', 'side' => $sideResults[(int) $user->id], 'total_points' => (int) DB::table('users')->where('id', $user->id)->value('points')];
        });

        $person = ['id' => (int) $partner->id, 'name' => $partner->name];
        if ($result['status'] === 'pending') {
            return response()->json(['status' => 'pending', 'partner' => $person]);
        }

        return response()->json([
            'status' => 'completed',
            'partner' => $person,
            'points_gained' => $result['side']['points'],
            'zone' => [
                'zone_id' => (int) $event->zone_id,
                'exchange_count' => $result['side']['exchange_count'],
                'required_count' => (int) $zone->required_count,
                'unlocked' => $result['side']['unlocked'],
                'unlocked_now' => $result['side']['unlocked_now'],
            ],
            'total_points' => $result['total_points'],
        ]);
    }
}
