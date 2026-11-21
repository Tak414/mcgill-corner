<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRsvp;
use App\Models\Exchange;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RsvpApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_attendee_can_rsvp_idempotently_before_the_code_window(): void
    {
        config(['app.demo_mode' => false]);
        $this->travelTo('2026-11-21 16:00:00 UTC');
        $attendee = User::factory()->create();
        $event = Event::factory()->create([
            'starts_at' => now()->addHours(5),
            'ends_at' => now()->addHours(7),
        ]);

        $response = $this->actingAs($attendee, 'sanctum')->postJson('/api/events/'.$event->id.'/rsvp');
        $response->assertOk()
            ->assertExactJson(['going_count' => 1, 'code_window' => 'before', 'my_code' => null]);
        $this->postJson('/api/events/'.$event->id.'/rsvp')->assertOk()->assertJsonPath('going_count', 1);
        $this->assertDatabaseCount('rsvps', 1);
        $this->assertDatabaseHas('rsvps', ['event_id' => $event->id, 'user_id' => $attendee->id, 'code' => null]);
    }

    public function test_rsvp_issues_a_four_digit_code_when_the_window_is_open(): void
    {
        config(['app.demo_mode' => false]);
        $this->travelTo('2026-11-21 16:00:00 UTC');
        $attendee = User::factory()->create();
        $event = Event::factory()->create([
            'starts_at' => now()->addHours(2),
            'ends_at' => now()->addHours(4),
        ]);

        $response = $this->actingAs($attendee, 'sanctum')->postJson('/api/events/'.$event->id.'/rsvp')->assertOk();
        $code = $response->json('my_code');
        $this->assertSame('open', $response->json('code_window'));
        $this->assertMatchesRegularExpression('/^\d{4}$/', $code);
        $this->assertDatabaseHas('rsvps', ['event_id' => $event->id, 'user_id' => $attendee->id, 'code' => $code]);
    }

    public function test_host_rsvp_is_forbidden_and_rsvp_after_ending_returns_event_ended(): void
    {
        config(['app.demo_mode' => false]);
        $this->travelTo('2026-11-21 16:00:00 UTC');
        $event = Event::factory()->create([
            'starts_at' => now()->subHours(5),
            'ends_at' => now()->subMinute(),
        ]);
        $host = User::query()->findOrFail($event->host_id);
        $attendee = User::factory()->create();

        $this->actingAs($host, 'sanctum')->postJson('/api/events/'.$event->id.'/rsvp')->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN_ROLE');
        $this->actingAs($attendee, 'sanctum')->postJson('/api/events/'.$event->id.'/rsvp')->assertUnprocessable()
            ->assertJsonPath('error.code', 'EVENT_ENDED');
    }

    public function test_cancel_without_an_rsvp_returns_not_going(): void
    {
        $attendee = User::factory()->create();
        $event = Event::factory()->create();

        $this->actingAs($attendee, 'sanctum')->deleteJson('/api/events/'.$event->id.'/rsvp')->assertForbidden()
            ->assertJsonPath('error.code', 'NOT_GOING');
    }

    public function test_cannot_cancel_after_a_completed_exchange(): void
    {
        $attendee = User::factory()->create();
        $partner = User::factory()->create();
        $event = Event::factory()->create();
        EventRsvp::factory()->create(['event_id' => $event->id, 'user_id' => $attendee->id]);
        EventRsvp::factory()->create(['event_id' => $event->id, 'user_id' => $partner->id]);
        Exchange::factory()->create([
            'event_id' => $event->id,
            'user_low_id' => min($attendee->id, $partner->id),
            'user_high_id' => max($attendee->id, $partner->id),
            'low_confirmed' => true,
            'high_confirmed' => true,
            'completed_at' => now(),
        ]);

        $this->actingAs($attendee, 'sanctum')->deleteJson('/api/events/'.$event->id.'/rsvp')->assertStatus(409)
            ->assertJsonPath('error.code', 'CANNOT_CANCEL');
        $this->assertDatabaseHas('rsvps', ['event_id' => $event->id, 'user_id' => $attendee->id]);
    }

    public function test_cancel_removes_the_rsvp_and_pending_exchanges(): void
    {
        $attendee = User::factory()->create();
        $partner = User::factory()->create();
        $event = Event::factory()->create();
        EventRsvp::factory()->create(['event_id' => $event->id, 'user_id' => $attendee->id]);
        EventRsvp::factory()->create(['event_id' => $event->id, 'user_id' => $partner->id]);
        $exchange = Exchange::factory()->create([
            'event_id' => $event->id,
            'user_low_id' => min($attendee->id, $partner->id),
            'user_high_id' => max($attendee->id, $partner->id),
            'low_confirmed' => true,
            'high_confirmed' => false,
        ]);

        $this->actingAs($attendee, 'sanctum')->deleteJson('/api/events/'.$event->id.'/rsvp')->assertOk()
            ->assertExactJson(['going_count' => 1]);
        $this->assertDatabaseMissing('rsvps', ['event_id' => $event->id, 'user_id' => $attendee->id]);
        $this->assertDatabaseMissing('exchanges', ['id' => $exchange->id]);
    }
}
