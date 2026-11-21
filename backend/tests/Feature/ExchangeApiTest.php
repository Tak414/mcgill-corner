<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRsvp;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExchangeApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_exchange_completes_after_both_attendees_enter_each_others_code_and_awards_zone_bonus(): void
    {
        config(['app.demo_mode' => true]);
        $zone = Zone::factory()->create(['id' => 45, 'row' => 4, 'col' => 5, 'required_count' => 1, 'bonus_points' => 200]);
        $event = Event::factory()->create(['zone_id' => $zone->id]);
        $first = User::factory()->create();
        $second = User::factory()->create();
        EventRsvp::factory()->create(['event_id' => $event->id, 'user_id' => $first->id, 'code' => '1234']);
        EventRsvp::factory()->create(['event_id' => $event->id, 'user_id' => $second->id, 'code' => '5678']);

        $this->actingAs($first, 'sanctum')->postJson('/api/events/'.$event->id.'/exchange', ['code' => '5678'])
            ->assertOk()->assertExactJson(['status' => 'pending', 'partner' => ['id' => $second->id, 'name' => $second->name]]);

        $completed = $this->actingAs($second, 'sanctum')->postJson('/api/events/'.$event->id.'/exchange', ['code' => '1234']);
        $completed->assertOk()->assertExactJson([
            'status' => 'completed',
            'partner' => ['id' => $first->id, 'name' => $first->name],
            'points_gained' => 300,
            'zone' => ['zone_id' => 45, 'exchange_count' => 1, 'required_count' => 1, 'unlocked' => true, 'unlocked_now' => true],
            'total_points' => 300,
        ]);

        $this->assertDatabaseHas('exchanges', [
            'event_id' => $event->id,
            'user_low_id' => min($first->id, $second->id),
            'user_high_id' => max($first->id, $second->id),
            'low_confirmed' => true,
            'high_confirmed' => true,
            'low_points_gained' => 300,
            'high_points_gained' => 300,
            'low_unlocked_now' => true,
            'high_unlocked_now' => true,
        ]);
        $this->assertDatabaseHas('users', ['id' => $first->id, 'points' => 300]);
        $this->assertDatabaseHas('users', ['id' => $second->id, 'points' => 300]);
        $this->assertDatabaseHas('zone_progress', ['user_id' => $first->id, 'zone_id' => 45, 'exchange_count' => 1]);
        $this->assertDatabaseHas('zone_progress', ['user_id' => $second->id, 'zone_id' => 45, 'exchange_count' => 1]);

        $this->actingAs($first, 'sanctum')->postJson('/api/events/'.$event->id.'/exchange', ['code' => '5678'])
            ->assertStatus(409)->assertJsonPath('error.code', 'ALREADY_EXCHANGED');
    }

    public function test_exchange_checks_window_rsvp_code_and_own_code_in_contract_order(): void
    {
        $this->travelTo('2026-11-21 16:00:00 UTC');
        config(['app.demo_mode' => false]);
        $event = Event::factory()->create(['starts_at' => now()->addHours(5), 'ends_at' => now()->addHours(7)]);
        $caller = User::factory()->create();
        $partner = User::factory()->create();
        EventRsvp::factory()->create(['event_id' => $event->id, 'user_id' => $caller->id, 'code' => null]);
        EventRsvp::factory()->create(['event_id' => $event->id, 'user_id' => $partner->id, 'code' => '1234']);

        $this->actingAs($caller, 'sanctum')->postJson('/api/events/'.$event->id.'/exchange', ['code' => '1234'])
            ->assertUnprocessable()->assertJsonPath('error.code', 'CODE_WINDOW_CLOSED');

        $this->travelTo('2026-11-21 18:00:00 UTC');
        $withoutRsvp = User::factory()->create();
        $this->actingAs($withoutRsvp, 'sanctum')->postJson('/api/events/'.$event->id.'/exchange', ['code' => '9999'])
            ->assertForbidden()->assertJsonPath('error.code', 'NOT_GOING');
        $this->actingAs($caller, 'sanctum')->postJson('/api/events/'.$event->id.'/exchange', ['code' => '9999'])
            ->assertNotFound()->assertJsonPath('error.code', 'INVALID_CODE');

        EventRsvp::query()->where('user_id', $caller->id)->update(['code' => '4321']);
        $this->postJson('/api/events/'.$event->id.'/exchange', ['code' => '4321'])
            ->assertUnprocessable()->assertJsonPath('error.code', 'OWN_CODE');
    }

    public function test_host_cannot_exchange_and_code_must_match_the_contract_shape(): void
    {
        config(['app.demo_mode' => true]);
        $event = Event::factory()->create();
        $host = User::query()->findOrFail($event->host_id);
        $this->actingAs($host, 'sanctum')->postJson('/api/events/'.$event->id.'/exchange', ['code' => '1234'])
            ->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN_ROLE');

        $attendee = User::factory()->create();
        $this->actingAs($attendee, 'sanctum')->postJson('/api/events/'.$event->id.'/exchange', ['code' => '12'])
            ->assertUnprocessable()->assertJsonPath('error.code', 'VALIDATION_FAILED');
    }
}
