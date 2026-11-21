<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRsvp;
use App\Models\User;
use App\Models\Zone;
use Database\Seeders\ZoneSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_host_creates_an_event_with_server_computed_zone_and_utc_storage(): void
    {
        config(['app.demo_mode' => false]);
        $this->travelTo('2026-11-21 16:00:00 UTC');
        $this->seed(ZoneSeeder::class);
        $host = User::factory()->host()->create();

        $response = $this->actingAs($host, 'sanctum')->postJson('/api/events', [
            'title' => 'Board Game Night',
            'description' => 'Bring a game.',
            'location_name' => 'Trottier Lobby',
            'address' => null,
            'lat' => 45.5048,
            'lng' => -73.5772,
            'zone_id' => 99,
            'starts_at' => '2026-11-21T18:00:00-05:00',
            'ends_at' => '2026-11-21T20:00:00-05:00',
        ]);

        $response->assertCreated()
            ->assertJsonStructure([
                'id', 'title', 'location_name', 'lat', 'lng', 'zone_id', 'starts_at', 'ends_at',
                'code_window', 'going_count', 'is_going', 'host', 'description', 'address',
                'code_available_at', 'my_code', 'can_cancel', 'pending_from', 'people_met_here',
            ])
            ->assertJsonPath('zone_id', 45)
            ->assertJsonPath('code_window', 'before')
            ->assertJsonPath('address', null)
            ->assertJsonPath('host.id', $host->id)
            ->assertJsonPath('my_code', null);
        $this->assertDatabaseHas('events', [
            'host_id' => $host->id,
            'zone_id' => 45,
            'starts_at' => '2026-11-21 23:00:00',
            'ends_at' => '2026-11-22 01:00:00',
        ]);
    }

    public function test_event_creation_returns_outside_grid_for_valid_signs_and_validation_error_for_positive_longitude(): void
    {
        config(['app.demo_mode' => false]);
        $this->travelTo('2026-11-21 16:00:00 UTC');
        $host = User::factory()->host()->create();
        $base = [
            'title' => 'Campus event',
            'location_name' => 'McGill',
            'starts_at' => '2026-11-21T18:00:00-05:00',
            'ends_at' => '2026-11-21T19:00:00-05:00',
        ];

        $this->actingAs($host, 'sanctum')->postJson('/api/events', [...$base, 'lat' => 45.60, 'lng' => -73.70])
            ->assertUnprocessable()->assertJsonPath('error.code', 'OUTSIDE_GRID');
        $this->actingAs($host, 'sanctum')->postJson('/api/events', [...$base, 'lat' => 45.5048, 'lng' => 73.5772])
            ->assertUnprocessable()->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure(['error' => ['fields' => ['lng']]]);
    }

    public function test_attendee_cannot_create_an_event(): void
    {
        $attendee = User::factory()->create();

        $this->actingAs($attendee, 'sanctum')->postJson('/api/events', [])->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN_ROLE');
    }

    public function test_event_list_contains_only_events_that_have_not_ended(): void
    {
        config(['app.demo_mode' => false]);
        $this->travelTo('2026-11-21 16:00:00 UTC');
        $attendee = User::factory()->create();
        $zone = Zone::factory()->create(['id' => 45, 'row' => 4, 'col' => 5]);
        $current = Event::factory()->create([
            'zone_id' => $zone->id,
            'starts_at' => now()->addHour(),
            'ends_at' => now()->addHours(3),
        ]);
        Event::factory()->create([
            'zone_id' => $zone->id,
            'starts_at' => now()->subHours(3),
            'ends_at' => now()->subMinute(),
        ]);
        EventRsvp::factory()->create(['event_id' => $current->id, 'user_id' => $attendee->id]);

        $this->actingAs($attendee, 'sanctum')->getJson('/api/events')->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $current->id)
            ->assertJsonPath('0.is_going', true)
            ->assertJsonPath('0.going_count', 1)
            ->assertJsonPath('0.host.id', $current->host_id);
    }

    public function test_event_detail_lazily_issues_a_stable_code_only_for_a_going_attendee(): void
    {
        config(['app.demo_mode' => false]);
        $this->travelTo('2026-11-21 16:00:00 UTC');
        $attendee = User::factory()->create();
        $event = Event::factory()->create([
            'starts_at' => now()->addHours(2),
            'ends_at' => now()->addHours(4),
        ]);
        EventRsvp::factory()->create(['event_id' => $event->id, 'user_id' => $attendee->id]);

        $firstResponse = $this->actingAs($attendee, 'sanctum')->getJson('/api/events/'.$event->id)->assertOk();
        $firstCode = $firstResponse->json('my_code');
        $this->assertMatchesRegularExpression('/^\d{4}$/', $firstCode);
        $this->assertDatabaseHas('rsvps', ['event_id' => $event->id, 'user_id' => $attendee->id, 'code' => $firstCode]);

        $this->getJson('/api/events/'.$event->id)->assertOk()->assertJsonPath('my_code', $firstCode);
    }
}
