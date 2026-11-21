<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRsvp;
use App\Models\Exchange;
use App\Models\User;
use App\Models\Zone;
use App\Models\ZoneProgress;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ContractSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_contract_tables_and_relations_are_available(): void
    {
        $host = User::factory()->host()->create();
        $attendee = User::factory()->create();
        $zone = Zone::factory()->create([
            'id' => 45, 'row' => 4, 'col' => 5, 'required_count' => 1, 'bonus_points' => 200,
        ]);
        $event = Event::factory()->create([
            'host_id' => $host->id,
            'zone_id' => $zone->id,
        ]);
        $rsvp = EventRsvp::factory()->create([
            'event_id' => $event->id,
            'user_id' => $attendee->id,
        ]);
        $lowUser = User::factory()->create();
        $highUser = User::factory()->create();
        $exchange = Exchange::factory()->create([
            'event_id' => $event->id,
            'user_low_id' => $lowUser->id,
            'user_high_id' => $highUser->id,
        ]);
        $progress = ZoneProgress::factory()->create([
            'user_id' => $attendee->id,
            'zone_id' => $zone->id,
        ]);

        $this->assertTrue($event->host->is($host));
        $this->assertTrue($event->zone->is($zone));
        $this->assertTrue($rsvp->event->is($event));
        $this->assertTrue($exchange->lowUser->is($lowUser));
        $this->assertTrue($progress->user->is($attendee));
        $this->assertTrue($progress->zone->is($zone));
        $this->assertFalse(Schema::hasTable('profiles'));
        $this->assertFalse(Schema::hasTable('interests'));
        $this->assertFalse(Schema::hasTable('achievements'));
    }

    public function test_rsvp_uniqueness_is_enforced(): void
    {
        $event = Event::factory()->create();
        $first = User::factory()->create();
        EventRsvp::factory()->create(['event_id' => $event->id, 'user_id' => $first->id]);
        $this->expectException(QueryException::class);
        EventRsvp::factory()->create(['event_id' => $event->id, 'user_id' => $first->id]);
    }

    public function test_exchange_pair_uniqueness_is_enforced(): void
    {
        $event = Event::factory()->create();
        $first = User::factory()->create();
        $second = User::factory()->create();
        $attributes = [
            'event_id' => $event->id,
            'user_low_id' => $first->id,
            'user_high_id' => $second->id,
        ];
        Exchange::factory()->create($attributes);

        $this->expectException(QueryException::class);
        Exchange::factory()->create($attributes);
    }
}
