<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreEventRequest;
use App\Http\Resources\Api\EventDetailResource;
use App\Http\Resources\Api\EventSummaryResource;
use App\Models\Event;
use App\Models\EventRsvp;
use App\Models\Exchange;
use App\Models\User;
use App\Services\EventCodeIssuer;
use App\Services\ZoneGrid;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;
        $events = Event::query()
            ->with('host')
            ->withCount('rsvps')
            ->withExists(['rsvps as is_going' => fn ($query) => $query->where('user_id', $userId)])
            ->where('ends_at', '>=', now('UTC'))
            ->orderBy('starts_at')
            ->orderBy('id')
            ->get();

        foreach ($events as $event) {
            $event->setAttribute('code_window', $event->codeWindow());
        }

        return response()->json(EventSummaryResource::collection($events)->resolve($request));
    }

    public function store(StoreEventRequest $request, ZoneGrid $zoneGrid): JsonResponse
    {
        $data = $request->validated();
        $location = $zoneGrid->locate((float) $data['lat'], (float) $data['lng']);

        if ($location === null) {
            throw new ApiException('OUTSIDE_GRID', 'This location is outside the map grid.');
        }

        $event = DB::transaction(fn (): Event => Event::query()->create([
            'host_id' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? '',
            'location_name' => $data['location_name'],
            'address' => $data['address'] ?? null,
            'lat' => (float) $data['lat'],
            'lng' => (float) $data['lng'],
            'zone_id' => $location['id'],
            'starts_at' => CarbonImmutable::parse($data['starts_at'])->utc(),
            'ends_at' => CarbonImmutable::parse($data['ends_at'])->utc(),
        ]));

        $event->load('host');
        $event->setAttribute('rsvps_count', 0);
        $event->setAttribute('is_going', false);
        $event->setAttribute('code_window', $event->codeWindow());
        $event->setAttribute('my_code', null);
        $event->setAttribute('can_cancel', false);
        $event->setAttribute('pending_from', []);
        $event->setAttribute('people_met_here', []);

        return response()->json((new EventDetailResource($event))->resolve($request), 201);
    }

    public function show(Request $request, Event $event, EventCodeIssuer $codeIssuer): JsonResponse
    {
        $viewer = $request->user();
        $codeWindow = $event->codeWindow();

        if ($viewer->role === 'attendee' && $codeWindow === 'open') {
            $codeIssuer->issueFor($event, (int) $viewer->id);
        }

        $event->load('host')->loadCount('rsvps');
        $rsvp = EventRsvp::query()->where('event_id', $event->id)->where('user_id', $viewer->id)->first();
        $isGoing = $viewer->role === 'attendee' && $rsvp !== null;
        $event->setAttribute('is_going', $isGoing);
        $event->setAttribute('code_window', $codeWindow);
        $event->setAttribute('my_code', $isGoing && $codeWindow === 'open' ? $rsvp->code : null);

        $hasCompletedExchange = $isGoing && Exchange::query()
            ->where('event_id', $event->id)
            ->whereNotNull('completed_at')
            ->where(fn ($query) => $query->where('user_low_id', $viewer->id)->orWhere('user_high_id', $viewer->id))
            ->exists();
        $event->setAttribute('can_cancel', $isGoing && ! $hasCompletedExchange);
        $event->setAttribute('pending_from', $this->pendingFrom($event, $viewer));
        $event->setAttribute('people_met_here', $this->peopleMetHere($event, $viewer));

        return response()->json((new EventDetailResource($event))->resolve($request));
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function pendingFrom(Event $event, User $viewer): array
    {
        if ($viewer->role !== 'attendee' || $event->codeWindow() !== 'open') {
            return [];
        }

        $query = Exchange::query()->with(['lowUser', 'highUser'])
            ->where('event_id', $event->id)
            ->whereNull('completed_at');

        $query->where(function ($query) use ($viewer): void {
            $query->where(function ($lowSide) use ($viewer): void {
                $lowSide->where('user_low_id', $viewer->id)
                    ->where('high_confirmed', true)
                    ->where('low_confirmed', false);
            })->orWhere(function ($highSide) use ($viewer): void {
                $highSide->where('user_high_id', $viewer->id)
                    ->where('low_confirmed', true)
                    ->where('high_confirmed', false);
            });
        });

        return $query->get()->map(function (Exchange $exchange) use ($viewer): array {
            $partner = $exchange->user_low_id === $viewer->id ? $exchange->highUser : $exchange->lowUser;

            return ['id' => (int) $partner->id, 'name' => $partner->name];
        })->values()->all();
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function peopleMetHere(Event $event, User $viewer): array
    {
        if ($viewer->role !== 'attendee') {
            return [];
        }

        return Exchange::query()
            ->with(['lowUser', 'highUser'])
            ->where('event_id', $event->id)
            ->whereNotNull('completed_at')
            ->where(fn ($query) => $query->where('user_low_id', $viewer->id)->orWhere('user_high_id', $viewer->id))
            ->get()
            ->map(function (Exchange $exchange) use ($viewer): array {
                $partner = $exchange->user_low_id === $viewer->id ? $exchange->highUser : $exchange->lowUser;

                return ['id' => (int) $partner->id, 'name' => $partner->name];
            })
            ->values()
            ->all();
    }
}
