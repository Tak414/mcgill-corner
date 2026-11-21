<?php

namespace Tests\Feature;

use App\Models\Achievement;
use App\Models\Event;
use App\Models\EventRsvp;
use App\Models\Interest;
use App\Models\Neighborhood;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserAchievement;
use App\Models\UserExplorationProgress;
use App\Models\XpTransaction;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Tests\TestCase;

class DatabaseEntitiesTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_entity_migrations_and_core_relations_work(): void
    {
        $user = User::factory()->create();
        $profile = Profile::factory()->create(['user_id' => $user->id]);
        $interest = Interest::factory()->create();
        $neighborhood = Neighborhood::factory()->create();
        $achievement = Achievement::factory()->create();

        $event = Event::factory()->create([
            'organizer_id' => $user->id,
            'neighborhood_id' => $neighborhood->id,
        ]);

        $rsvp = EventRsvp::factory()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
        ]);

        $progress = UserExplorationProgress::factory()->create([
            'user_id' => $user->id,
            'neighborhood_id' => $neighborhood->id,
        ]);

        $userAchievement = UserAchievement::factory()->create([
            'user_id' => $user->id,
            'achievement_id' => $achievement->id,
        ]);

        $user->interests()->attach($interest->id);
        XpTransaction::award($user, 100, 'test_award');

        $this->assertTrue($user->profile->is($profile));
        $this->assertTrue($user->interests->first()->is($interest));
        $this->assertTrue($event->organizer->is($user));
        $this->assertTrue($event->neighborhood->is($neighborhood));
        $this->assertTrue($rsvp->event->is($event));
        $this->assertTrue($progress->neighborhood->is($neighborhood));
        $this->assertTrue($userAchievement->achievement->is($achievement));
        $this->assertSame(100, $user->xpBalance());
    }

    public function test_rsvp_is_unique_per_user_and_event(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create(['organizer_id' => $user->id]);

        EventRsvp::factory()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
        ]);

        $this->expectException(QueryException::class);

        EventRsvp::factory()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
        ]);
    }

    public function test_user_interest_relationship_is_unique(): void
    {
        $user = User::factory()->create();
        $interest = Interest::factory()->create();
        $user->interests()->attach($interest->id);

        $this->expectException(QueryException::class);
        $user->interests()->attach($interest->id);
    }

    public function test_xp_application_validation_and_database_guard_prevent_negative_balance(): void
    {
        $user = User::factory()->create();

        $this->expectException(InvalidArgumentException::class);
        XpTransaction::award($user, -1, 'invalid_deduction');
    }

    public function test_xp_transactions_are_immutable_and_balance_is_calculated(): void
    {
        $user = User::factory()->create();
        $transaction = XpTransaction::award($user, 50, 'event_attendance');

        $this->assertSame(50, $user->xpBalance());
        $this->assertSame(50, (int) DB::table('xp_transactions')->where('user_id', $user->id)->sum('amount'));

        $this->expectException(QueryException::class);
        $transaction->update(['amount' => 25]);
    }

    public function test_geographic_values_store_and_nearby_spatial_query_executes(): void
    {
        $user = User::factory()->create();
        $neighborhood = Neighborhood::factory()->create();
        $nearEvent = Event::factory()->create([
            'organizer_id' => $user->id,
            'neighborhood_id' => $neighborhood->id,
            'location_point' => json_encode([
                'type' => 'Point',
                'coordinates' => [-73.5772, 45.5048],
            ]),
        ]);
        Event::factory()->create([
            'organizer_id' => $user->id,
            'neighborhood_id' => $neighborhood->id,
            'location_point' => json_encode([
                'type' => 'Point',
                'coordinates' => [-74.0000, 45.6000],
            ]),
        ]);

        $nearby = Event::near(-73.5770, 45.5050, 1000)->pluck('id');

        $this->assertContains($nearEvent->id, $nearby->all());
        $this->assertJson((string) $nearEvent->location_point);
    }

    public function test_profile_and_exploration_constraints_are_enforced(): void
    {
        $user = User::factory()->create();
        $neighborhood = Neighborhood::factory()->create();

        UserExplorationProgress::factory()->create([
            'user_id' => $user->id,
            'neighborhood_id' => $neighborhood->id,
            'progress_percent' => 50,
        ]);

        $this->expectException(QueryException::class);
        UserExplorationProgress::factory()->create([
            'user_id' => $user->id,
            'neighborhood_id' => $neighborhood->id,
            'progress_percent' => 75,
        ]);
    }
}
