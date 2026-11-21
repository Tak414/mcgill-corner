<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRsvp;
use App\Models\Exchange;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AccountDataApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_me_returns_only_the_callers_zone_progress_and_empty_progress_for_hosts(): void
    {
        $zone = Zone::factory()->create(['id' => 45, 'row' => 4, 'col' => 5, 'required_count' => 1]);
        $attendee = User::factory()->create(['points' => 300]);
        DB::table('zone_progress')->insert(['user_id' => $attendee->id, 'zone_id' => $zone->id, 'exchange_count' => 1, 'unlocked_at' => now()]);

        $this->actingAs($attendee, 'sanctum')->getJson('/api/me')->assertOk()->assertExactJson([
            'id' => $attendee->id,
            'name' => $attendee->name,
            'role' => 'attendee',
            'points' => 300,
            'zone_progress' => [['zone_id' => 45, 'exchange_count' => 1, 'required_count' => 1, 'unlocked' => true]],
        ]);

        $host = User::factory()->host()->create();
        $this->actingAs($host, 'sanctum')->getJson('/api/me')->assertOk()->assertJsonPath('zone_progress', []);
    }

    public function test_exchange_polling_returns_last_twenty_or_items_after_since(): void
    {
        $caller = User::factory()->create();
        $partner = User::factory()->create();
        $earlier = now()->subMinutes(2);
        $later = now()->subMinute();
        foreach ([$earlier, $later] as $completedAt) {
            $event = Event::factory()->create();
            Exchange::factory()->create([
                'event_id' => $event->id,
                'user_low_id' => min($caller->id, $partner->id),
                'user_high_id' => max($caller->id, $partner->id),
                'low_confirmed' => true,
                'high_confirmed' => true,
                'completed_at' => $completedAt,
                'low_points_gained' => 100,
                'high_points_gained' => 300,
                'low_unlocked_now' => false,
                'high_unlocked_now' => true,
            ]);
        }

        $response = $this->actingAs($caller, 'sanctum')->getJson('/api/me/exchanges')->assertOk();
        $response->assertJsonCount(2, 'exchanges');
        $item = $response->json('exchanges.0');
        $callerIsLow = $caller->id < $partner->id;
        $response->assertJsonPath('exchanges.0.partner.id', $partner->id)
            ->assertJsonPath('exchanges.0.points_gained', $callerIsLow ? 100 : 300)
            ->assertJsonPath('exchanges.0.unlocked_now', ! $callerIsLow)
            ->assertJsonPath('exchanges.0.event.id', $event->id);
        $this->assertNotEmpty($item['completed_at']);

        $since = $earlier->toIso8601String();
        $this->getJson('/api/me/exchanges?since='.urlencode($since))->assertOk()->assertJsonCount(1, 'exchanges');
        $this->getJson('/api/me/exchanges?since=not-a-date')->assertUnprocessable()->assertJsonPath('error.code', 'VALIDATION_FAILED');
    }

    public function test_leaderboard_ranks_ties_and_includes_callers_row_outside_the_top_twenty(): void
    {
        $this->travelTo('2026-11-21 16:00:00 UTC');
        User::factory()->create(['points' => 1000]);
        User::factory()->create(['points' => 1000]);
        User::factory()->create(['points' => 900]);
        User::factory()->count(22)->create()->each(function (User $user, int $index): void {
            $user->forceFill(['points' => 800 - $index])->save();
        });
        $me = User::factory()->create(['points' => 1]);
        $me->forceFill(['points' => 1])->save();

        $response = $this->actingAs($me, 'sanctum')->getJson('/api/leaderboard')->assertOk();
        $response->assertJsonCount(20, 'top')->assertJsonPath('top.0.rank', 1)->assertJsonPath('top.1.rank', 1)
            ->assertJsonPath('top.2.rank', 3)->assertJsonPath('me.user_id', $me->id)->assertJsonPath('me.rank', 26);

        $host = User::factory()->host()->create();
        $this->actingAs($host, 'sanctum')->getJson('/api/leaderboard')->assertOk()->assertJsonPath('me', null);
    }

    public function test_host_events_include_rsvp_and_completed_exchange_counts_and_reject_attendees(): void
    {
        $host = User::factory()->host()->create();
        $event = Event::factory()->create(['host_id' => $host->id]);
        $attendee = User::factory()->create();
        $partner = User::factory()->create();
        EventRsvp::factory()->create(['event_id' => $event->id, 'user_id' => $attendee->id]);
        Exchange::factory()->create([
            'event_id' => $event->id,
            'user_low_id' => min($attendee->id, $partner->id),
            'user_high_id' => max($attendee->id, $partner->id),
            'low_confirmed' => true,
            'high_confirmed' => true,
            'completed_at' => now(),
        ]);

        $this->actingAs($host, 'sanctum')->getJson('/api/host/events')->assertOk()
            ->assertJsonPath('0.id', $event->id)->assertJsonPath('0.going_count', 1)->assertJsonPath('0.completed_exchange_count', 1);
        $this->actingAs($attendee, 'sanctum')->getJson('/api/host/events')->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN_ROLE');
    }

    public function test_zones_returns_the_complete_contract_grid(): void
    {
        $this->seed();
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum')->getJson('/api/zones')->assertOk()
            ->assertJsonPath('rows', 10)->assertJsonPath('cols', 10)->assertJsonCount(100, 'cells')
            ->assertJsonPath('cells.45.id', 45)->assertJsonPath('cells.45.required_count', 1)
            ->assertJsonPath('cells.45.bounds.south', 45.496);
    }
}
