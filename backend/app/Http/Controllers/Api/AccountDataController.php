<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\EventSummaryResource;
use App\Models\Event;
use App\Models\Exchange;
use App\Models\User;
use App\Models\Zone;
use App\Services\ZoneGrid;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountDataController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $progress = $user->role === 'host' ? collect() : DB::table('zone_progress')
            ->join('zones', 'zones.id', '=', 'zone_progress.zone_id')
            ->where('user_id', $user->id)
            ->where('exchange_count', '>', 0)
            ->orderBy('zone_id')
            ->get(['zone_id', 'exchange_count', 'required_count', 'unlocked_at'])
            ->map(fn ($row): array => [
                'zone_id' => (int) $row->zone_id,
                'exchange_count' => (int) $row->exchange_count,
                'required_count' => (int) $row->required_count,
                'unlocked' => $row->unlocked_at !== null,
            ]);

        return response()->json([
            'id' => (int) $user->id,
            'name' => $user->name,
            'role' => $user->role,
            'points' => (int) $user->points,
            'zone_progress' => $progress->values()->all(),
        ]);
    }

    public function exchanges(Request $request): JsonResponse
    {
        $validated = $request->validate(['since' => ['sometimes', 'date', 'regex:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/D']]);
        $since = $validated['since'] ?? null;
        $sinceTime = $since === null ? null : CarbonImmutable::parse($since)->utc();
        $userId = (int) $request->user()->id;
        $query = Exchange::query()->with(['event', 'lowUser', 'highUser'])
            ->whereNotNull('completed_at')
            ->where(fn ($q) => $q->where('user_low_id', $userId)->orWhere('user_high_id', $userId));
        if ($sinceTime !== null) {
            $query->where('completed_at', '>', $sinceTime);
        }
        if ($sinceTime === null) {
            $query->limit(20);
        }
        $rows = $query->orderByDesc('completed_at')->orderByDesc('id')->get();
        $items = $rows->map(function (Exchange $exchange) use ($userId): array {
            $isLow = (int) $exchange->user_low_id === $userId;
            $partner = $isLow ? $exchange->highUser : $exchange->lowUser;

            return [
                'id' => (int) $exchange->id,
                'event' => ['id' => (int) $exchange->event->id, 'title' => $exchange->event->title],
                'partner' => ['id' => (int) $partner->id, 'name' => $partner->name],
                'completed_at' => $this->toronto($exchange->completed_at),
                'points_gained' => (int) ($isLow ? $exchange->low_points_gained : $exchange->high_points_gained),
                'zone_id' => (int) $exchange->event->zone_id,
                'unlocked_now' => (bool) ($isLow ? $exchange->low_unlocked_now : $exchange->high_unlocked_now),
            ];
        })->values()->all();

        return response()->json(['server_time' => $this->toronto(now('UTC')), 'exchanges' => $items]);
    }

    public function leaderboard(Request $request): JsonResponse
    {
        $users = User::query()->where('role', 'attendee')->orderByDesc('points')->orderBy('id')->get(['id', 'name', 'points']);
        $toEntry = fn (User $user): array => [
            'rank' => 1 + $users->filter(fn (User $other): bool => (int) $other->points > (int) $user->points)->count(),
            'user_id' => (int) $user->id,
            'name' => $user->name,
            'points' => (int) $user->points,
        ];
        $topUsers = $users->take(20);
        $caller = $request->user();
        $me = $caller->role === 'host' ? null : $users->firstWhere('id', $caller->id);

        return response()->json([
            'top' => $topUsers->map($toEntry)->values()->all(),
            'me' => $me === null ? null : $toEntry($me),
        ]);
    }

    public function hostEvents(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'host') {
            throw new ApiException('FORBIDDEN_ROLE', "Your account type can't do this.");
        }

        $events = Event::query()->with('host')->withCount('rsvps')
            ->withExists(['rsvps as is_going' => fn ($query) => $query->where('user_id', $request->user()->id)])
            ->withCount(['exchanges as completed_exchange_count' => fn ($query) => $query->whereNotNull('completed_at')])
            ->where('host_id', $request->user()->id)
            ->orderByDesc('starts_at')->orderByDesc('id')->get();
        foreach ($events as $event) {
            $event->setAttribute('code_window', $event->codeWindow());
        }

        $summaries = EventSummaryResource::collection($events)->resolve($request);
        foreach ($summaries as $index => $summary) {
            $summaries[$index]['completed_exchange_count'] = (int) $events[$index]->completed_exchange_count;
        }

        return response()->json($summaries);
    }

    public function zones(ZoneGrid $grid): JsonResponse
    {
        $cells = Zone::query()->orderBy('id')->get();
        if ($cells->count() !== 100) {
            $cells = collect($grid->cells())->map(fn (array $cell) => (object) $cell);
        }

        return response()->json([
            'bounds' => ['south' => ZoneGrid::SOUTH, 'west' => ZoneGrid::WEST, 'north' => ZoneGrid::NORTH, 'east' => ZoneGrid::EAST],
            'rows' => ZoneGrid::ROWS,
            'cols' => ZoneGrid::COLS,
            'cells' => $cells->map(fn ($zone): array => [
                'id' => (int) $zone->id,
                'row' => (int) $zone->row,
                'col' => (int) $zone->col,
                'bounds' => ['south' => (float) $zone->south, 'west' => (float) $zone->west, 'north' => (float) $zone->north, 'east' => (float) $zone->east],
                'required_count' => (int) $zone->required_count,
                'bonus_points' => (int) $zone->bonus_points,
            ])->values()->all(),
        ]);
    }

    private function toronto(\DateTimeInterface $time): string
    {
        return CarbonImmutable::instance($time)->setTimezone('America/Toronto')->toIso8601String();
    }
}
