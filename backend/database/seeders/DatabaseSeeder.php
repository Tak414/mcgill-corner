<?php

namespace Database\Seeders;

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
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $students = [
            ['name' => 'Avery North', 'email' => 'avery.north@example.test', 'username' => 'avery_n'],
            ['name' => 'Morgan Finch', 'email' => 'morgan.finch@example.test', 'username' => 'morgan_f'],
            ['name' => 'Riley Calder', 'email' => 'riley.calder@example.test', 'username' => 'riley_c'],
            ['name' => 'Samira Vale', 'email' => 'samira.vale@example.test', 'username' => 'samira_v'],
            ['name' => 'Theo Linden', 'email' => 'theo.linden@example.test', 'username' => 'theo_l'],
        ];

        $users = collect();

        foreach ($students as $student) {
            $user = User::factory()->create([
                'name' => $student['name'],
                'email' => $student['email'],
                'password' => Hash::make('password'),
            ]);

            Profile::factory()->create([
                'user_id' => $user->id,
                'username' => $student['username'],
                'university' => 'McGill University',
            ]);

            $users->push($user);
        }

        $interestData = [
            ['name' => 'Campus Hiking', 'slug' => 'campus-hiking', 'category' => 'Sports'],
            ['name' => 'Board Games', 'slug' => 'board-games', 'category' => 'Social'],
            ['name' => 'Photography', 'slug' => 'photography', 'category' => 'Arts'],
            ['name' => 'Coding', 'slug' => 'coding', 'category' => 'Academic'],
            ['name' => 'Coffee', 'slug' => 'coffee', 'category' => 'Social'],
            ['name' => 'Running', 'slug' => 'running', 'category' => 'Sports'],
            ['name' => 'Live Music', 'slug' => 'live-music', 'category' => 'Arts'],
            ['name' => 'Sustainability', 'slug' => 'sustainability', 'category' => 'Academic'],
        ];

        $interests = collect($interestData)->map(
            fn (array $data) => Interest::create($data)
        );

        foreach ($users as $index => $user) {
            $user->interests()->sync(
                $interests->shuffle()->take(3)->pluck('id')->all()
            );
        }

        $neighborhoodData = [
            [
                'name' => 'Downtown Campus',
                'slug' => 'downtown-campus',
                'description' => 'The central McGill campus and surrounding streets.',
                'difficulty' => 1,
                'polygon' => [[[-73.5835, 45.5002], [-73.5738, 45.5002], [-73.5738, 45.5086], [-73.5835, 45.5086], [-73.5835, 45.5002]]],
            ],
            [
                'name' => 'Mount Royal North',
                'slug' => 'mount-royal-north',
                'description' => 'The northern edge of Mount Royal near the campus.',
                'difficulty' => 2,
                'polygon' => [[[-73.6000, 45.5085], [-73.5835, 45.5085], [-73.5835, 45.5155], [-73.6000, 45.5155], [-73.6000, 45.5085]]],
            ],
            [
                'name' => 'Milton Parc',
                'slug' => 'milton-parc',
                'description' => 'A lively residential area northeast of campus.',
                'difficulty' => 1,
                'polygon' => [[[-73.5845, 45.5086], [-73.5738, 45.5086], [-73.5738, 45.5160], [-73.5845, 45.5160], [-73.5845, 45.5086]]],
            ],
            [
                'name' => 'Lower McGill',
                'slug' => 'lower-mcgill',
                'description' => 'The eastern campus approaches and commercial streets.',
                'difficulty' => 2,
                'polygon' => [[[-73.5738, 45.5002], [-73.5650, 45.5002], [-73.5650, 45.5086], [-73.5738, 45.5086], [-73.5738, 45.5002]]],
            ],
        ];

        $neighborhoods = collect();

        foreach ($neighborhoodData as $data) {
            $polygon = $data['polygon'];
            unset($data['polygon']);

            $neighborhood = Neighborhood::create($data);

            if (DB::getDriverName() === 'pgsql') {
                $geoJson = json_encode(['type' => 'MultiPolygon', 'coordinates' => [$polygon]]);
                DB::statement(
                    'UPDATE neighborhoods SET boundary = ST_GeomFromGeoJSON(?)::geography WHERE id = ?',
                    [$geoJson, $neighborhood->id]
                );
            } else {
                $neighborhood->update([
                    'boundary' => json_encode(['type' => 'MultiPolygon', 'coordinates' => [$polygon]]),
                ]);
            }

            $neighborhoods->push($neighborhood);
        }

        $eventsData = [
            ['title' => 'Meet & Greet in the Quad', 'location_name' => 'McGill Lower Field', 'offset' => 1, 'longitude' => -73.5778, 'latitude' => 45.5049],
            ['title' => 'Board Game Social', 'location_name' => 'Student Union Building', 'offset' => 2, 'longitude' => -73.5770, 'latitude' => 45.5051],
            ['title' => 'Sunset Campus Photo Walk', 'location_name' => 'Redpath Museum Steps', 'offset' => 3, 'longitude' => -73.5775, 'latitude' => 45.5045],
            ['title' => 'Study Jam: Coding Basics', 'location_name' => 'Trottier Building', 'offset' => 4, 'longitude' => -73.5790, 'latitude' => 45.5062],
            ['title' => 'Mount Royal Community Hike', 'location_name' => 'Mount Royal Trailhead', 'offset' => 5, 'longitude' => -73.5878, 'latitude' => 45.5138],
            ['title' => 'Open-Air Acoustic Night', 'location_name' => 'Milton Parc Courtyard', 'offset' => 7, 'longitude' => -73.5805, 'latitude' => 45.5114],
        ];

        $events = collect();

        foreach ($eventsData as $index => $eventData) {
            $startsAt = now()->addDays($eventData['offset'])->setTime(18, 0);
            $event = Event::create([
                'organizer_id' => $users[$index % $users->count()]->id,
                'neighborhood_id' => $neighborhoods[$index % $neighborhoods->count()]->id,
                'title' => $eventData['title'],
                'description' => 'A fictional campus gathering open to students.',
                'location_name' => $eventData['location_name'],
                'starts_at' => $startsAt,
                'ends_at' => $startsAt->copy()->addHours(2),
                'status' => 'published',
                'visibility' => 'university',
                'capacity' => 20 + ($index * 10),
            ]);

            if (DB::getDriverName() === 'pgsql') {
                DB::statement(
                    'UPDATE events SET location_point = ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography WHERE id = ?',
                    [$eventData['longitude'], $eventData['latitude'], $event->id]
                );
            } else {
                $event->update([
                    'location_point' => json_encode([
                        'type' => 'Point',
                        'coordinates' => [$eventData['longitude'], $eventData['latitude']],
                    ]),
                ]);
            }

            $events->push($event);
        }

        foreach ($users as $index => $user) {
            foreach ($events->shuffle()->take(2 + ($index % 2)) as $event) {
                EventRsvp::create([
                    'user_id' => $user->id,
                    'event_id' => $event->id,
                    'status' => $index === 4 && $event->id % 2 === 0 ? 'interested' : 'going',
                    'responded_at' => now()->subMinutes(rand(1, 500)),
                ]);
            }
        }

        foreach ($neighborhoods as $index => $neighborhood) {
            foreach ($users->take(3) as $offset => $user) {
                UserExplorationProgress::create([
                    'user_id' => $user->id,
                    'neighborhood_id' => $neighborhood->id,
                    'progress_percent' => min(100, 20 + ($index * 15) + ($offset * 10)),
                    'visit_count' => 1 + $index + $offset,
                    'first_discovered_at' => now()->subDays(20 - $index),
                    'last_visited_at' => now()->subDays($index),
                ]);
            }
        }

        $achievements = collect([
            ['code' => 'first_discovery', 'name' => 'First Discovery', 'description' => 'Discover your first campus neighborhood.', 'xp_reward' => 50],
            ['code' => 'event_regular', 'name' => 'Event Regular', 'description' => 'Attend three campus events.', 'xp_reward' => 75],
            ['code' => 'community_host', 'name' => 'Community Host', 'description' => 'Host a completed community event.', 'xp_reward' => 150],
        ])->map(fn (array $data) => Achievement::create($data));

        foreach ($users as $index => $user) {
            if ($index < 4) {
                UserAchievement::create([
                    'user_id' => $user->id,
                    'achievement_id' => $achievements->first()->id,
                    'earned_at' => now()->subDays(5 - $index),
                ]);
            }

            XpTransaction::award($user, 50, 'neighborhood_discovery');
            XpTransaction::award($user, 100, 'event_attendance');

            if ($index % 2 === 0) {
                XpTransaction::award($user, 75, 'community_contribution');
            }
        }
    }
}
