<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_creates_known_demo_accounts_and_eight_hard_coded_pins(): void
    {
        $this->seed();

        $this->assertSame(2, User::query()->where('role', 'host')->count());
        $this->assertSame(6, User::query()->where('role', 'attendee')->count());
        $this->assertSame(8, Event::query()->count());
        $this->assertSame(45, Event::query()->where('title', 'Board Games at McGill')->value('zone_id'));
        $this->assertSame(46, Event::query()->where('title', 'Coffee and Conversation')->value('zone_id'));
        $this->assertSame(55, Event::query()->where('title', 'Campus Walk')->value('zone_id'));
        $this->assertTrue(Hash::check('unlock123', User::query()->where('email', 'attendee1@unlock.test')->firstOrFail()->password));
        $this->assertTrue(Hash::check('host12345', User::query()->where('email', 'host1@unlock.test')->firstOrFail()->password));
    }
}
