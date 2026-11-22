<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_creates_demo_accounts_and_six_real_mcgill_events(): void
    {
        $this->seed();

        $this->assertSame(2, User::query()->where('role', 'host')->count());
        $this->assertSame(22, User::query()->where('role', 'attendee')->count());
        $this->assertSame(6, Event::query()->count());
        $this->assertSame(45, Event::query()->where('location_name', 'Pollack Concert Hall')->value('zone_id'));
        $this->assertSame(35, Event::query()->where('location_name', 'Upstairs Jazz Bar & Grill')->value('zone_id'));
        $this->assertSame(55, Event::query()->where('location_name', 'McConnell Arena')->value('zone_id'));
        $this->assertTrue(Hash::check('unlock123', User::query()->where('email', 'attendee1@unlock.test')->firstOrFail()->password));
        $this->assertTrue(Hash::check('host12345', User::query()->where('email', 'host1@unlock.test')->firstOrFail()->password));
    }

    public function test_three_events_are_open_now_and_the_first_one_is_open_for_the_smoke_script(): void
    {
        config(['app.demo_mode' => false]);
        $this->seed();

        $windows = Event::query()->orderBy('id')->get()->map(fn (Event $event): string => $event->codeWindow());

        $this->assertSame(['open', 'open', 'open', 'before', 'before', 'before'], $windows->all());
    }

    public function test_seeded_points_follow_the_exchange_rules_and_attendee1_and_2_sit_at_ranks_9_and_10(): void
    {
        $this->seed();

        foreach (User::query()->where('role', 'attendee')->get() as $user) {
            $progress = DB::table('zone_progress')->join('zones', 'zones.id', '=', 'zone_progress.zone_id')
                ->where('user_id', $user->id)->get();
            $expected = $progress->sum(fn ($row): int => 100 * $row->exchange_count + ($row->unlocked_at === null ? 0 : $row->bonus_points));
            $this->assertSame($expected, (int) $user->points, $user->email);
            $this->assertTrue($progress->every(fn ($row): bool => ($row->unlocked_at !== null) === ($row->exchange_count >= $row->required_count)), $user->email);
        }

        $attendee1 = User::query()->where('email', 'attendee1@unlock.test')->firstOrFail();
        $board = $this->actingAs($attendee1)->getJson('/api/leaderboard')->assertOk();
        $this->assertSame(['rank' => 9, 'points' => 400], ['rank' => $board->json('me.rank'), 'points' => $board->json('me.points')]);

        $attendee2 = User::query()->where('email', 'attendee2@unlock.test')->firstOrFail();
        $this->assertSame(10, $this->actingAs($attendee2)->getJson('/api/leaderboard')->json('me.rank'));
    }
}
