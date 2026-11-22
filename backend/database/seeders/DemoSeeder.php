<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\User;
use App\Models\Zone;
use App\Services\ZoneGrid;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Demo data for testing and judging: six real McGill events (times relative to now, the first three
 * open for code exchange right away) and 22 explorers whose points and zones follow the game's rules.
 */
class DemoSeeder extends Seeder
{
    /**
     * Real venues, geocoded with OpenStreetMap Nominatim; the server computes each zone from lat/lng.
     * [title, description, location name, address, lat, lng, starts in (minutes), ends in (minutes)]
     */
    private const EVENTS = [
        [
            'Grand Chœur de McGill et Chœur universitaire de McGill',
            'Concert performed by the McGill University choirs.',
            'Pollack Concert Hall', '555 Sherbrooke St W, Montreal', 45.5057, -73.5733, -30, 90,
        ],
        [
            'McGill Jazz Combos',
            'Live jazz performance by McGill Faculty of Music students.',
            'Upstairs Jazz Bar & Grill', '1254 Rue Mackay, Montreal', 45.4956, -73.5768, -60, 120,
        ],
        [
            'McGill Infant Mental Health Day',
            'Clinical seminar on infant development and attachment theory (CA$90).',
            'MUHC Glen Site', '1001 Bd Décarie, Montreal', 45.4719, -73.6026, -120, 300,
        ],
        [
            'Noël jazzé - Rémi Bolduc',
            'Free jazz concert featuring saxophonist and McGill music faculty lecturer Rémi Bolduc.',
            'Maison de la culture NDG – Botrel', '3755 Rue Botrel, Montreal', 45.4756, -73.6144, 300, 420,
        ],
        [
            'Basketball - MCGILL @ UQAM',
            'Varsity basketball game against the UQAM Citadins.',
            'UQAM Sports Center', '1212 Rue Sanguinet, Montreal', 45.5120, -73.5600, 360, 480,
        ],
        [
            'McGill University vs Université de Montréal',
            'Varsity ice hockey rivalry game against Université de Montréal.',
            'McConnell Arena', '3883 Rue University, Montreal', 45.5119, -73.5827, 480, 630,
        ],
    ];

    /**
     * Attendees, highest score first. Each entry: [email, name, [zone_id => completed exchanges], RSVP'd event indexes].
     * Points are not typed in: they follow the exchange rule (+100 per exchange, + the zone's bonus once
     * exchange_count reaches its required_count). attendee1 (400 pts, rank 9) and attendee2 (300 pts, rank 10)
     * have not opened zone 45 or 35, so a live exchange at Pollack Hall or Upstairs (+300 each) lifts them
     * to rank 6 and 7.
     */
    private const ATTENDEES = [
        ['sophie.tremblay@unlock.test', 'Sophie Tremblay', [45 => 1, 46 => 1, 24 => 2, 25 => 1], [0, 5]],      // 1300
        ['daniel.okafor@unlock.test', 'Daniel Okafor', [45 => 2, 55 => 1, 35 => 1, 23 => 1], [1, 4]],          // 1100
        ['priya.raman@unlock.test', 'Priya Raman', [45 => 1, 56 => 1, 36 => 1, 26 => 1], [2]],                 // 1000
        ['lucas.gagnon@unlock.test', 'Lucas Gagnon', [45 => 1, 44 => 1, 54 => 1], [0, 5]],                     // 900
        ['mei.lin@unlock.test', 'Mei Lin', [45 => 1, 35 => 1, 24 => 1, 25 => 1], [1, 3]],                      // 800
        ['omar.haddad@unlock.test', 'Omar Haddad', [45 => 2, 47 => 1], [4, 5]],                                // 500
        ['chloe.bouchard@unlock.test', 'Chloé Bouchard', [55 => 1, 24 => 1, 57 => 1], [0, 3]],                 // 500
        ['ethan.wright@unlock.test', 'Ethan Wright', [46 => 1, 37 => 1, 65 => 1], [1]],                        // 500
        ['attendee1@unlock.test', 'Alex Chen', [46 => 1, 25 => 1], []],                                        // 400
        ['attendee2@unlock.test', 'Maya Singh', [44 => 1], []],                                                // 300
        ['gabriel.roy@unlock.test', 'Gabriel Roy', [45 => 1], [5]],                                            // 300
        ['aisha.mohamed@unlock.test', 'Aisha Mohamed', [56 => 1], [2, 4]],                                     // 300
        ['julien.lefebvre@unlock.test', 'Julien Lefebvre', [24 => 1, 25 => 1], [0]],                           // 200
        ['hana.kim@unlock.test', 'Hana Kim', [23 => 1, 33 => 1], [1, 3]],                                      // 200
        ['mateo.garcia@unlock.test', 'Mateo Garcia', [64 => 1, 65 => 1], [4]],                                 // 200
        ['amelie.cote@unlock.test', 'Amélie Côté', [26 => 1, 27 => 1], [0, 2]],                                // 200
        ['ravi.patel@unlock.test', 'Ravi Patel', [53 => 1, 63 => 1], [5]],                                     // 200
        ['nora.lindqvist@unlock.test', 'Nora Lindqvist', [24 => 1], [2]],                                      // 100
        ['samuel.nguyen@unlock.test', 'Samuel Nguyen', [37 => 1], [1]],                                        // 100
        ['ines.benali@unlock.test', 'Inès Benali', [53 => 1], [3]],                                            // 100
        ['liam.oconnor@unlock.test', "Liam O'Connor", [66 => 1], [4]],                                         // 100
        ['zoe.morin@unlock.test', 'Zoé Morin', [27 => 1], []],                                                 // 100
    ];

    public function run(): void
    {
        $host = User::query()->updateOrCreate(['email' => 'host1@unlock.test'], [
            'name' => 'UNLOCK Host One', 'password' => 'host12345', 'role' => 'host', 'points' => 0,
        ]);
        User::query()->updateOrCreate(['email' => 'host2@unlock.test'], [
            'name' => 'UNLOCK Host Two', 'password' => 'host12345', 'role' => 'host', 'points' => 0,
        ]);

        $now = now('UTC')->startOfMinute();
        $grid = app(ZoneGrid::class);
        $events = [];
        foreach (self::EVENTS as [$title, $description, $locationName, $address, $lat, $lng, $startsIn, $endsIn]) {
            $events[] = Event::query()->updateOrCreate(
                ['host_id' => $host->id, 'title' => $title],
                [
                    'description' => $description,
                    'location_name' => $locationName,
                    'address' => $address,
                    'lat' => $lat,
                    'lng' => $lng,
                    'zone_id' => $grid->locate($lat, $lng)['id'],
                    'starts_at' => $now->copy()->addMinutes($startsIn),
                    'ends_at' => $now->copy()->addMinutes($endsIn),
                ],
            );
        }

        $zones = Zone::query()->get(['id', 'required_count', 'bonus_points'])->keyBy('id');
        $rows = [];
        foreach (self::ATTENDEES as $index => [$email, $name, $progress, $going]) {
            $points = 0;
            $user = User::query()->updateOrCreate(['email' => $email], [
                'name' => $name, 'password' => 'unlock123', 'role' => 'attendee', 'points' => 0,
            ]);
            DB::table('zone_progress')->where('user_id', $user->id)->delete();
            foreach ($progress as $zoneId => $exchangeCount) {
                $zone = $zones[$zoneId];
                $unlocked = $exchangeCount >= $zone->required_count;
                $points += 100 * $exchangeCount + ($unlocked ? $zone->bonus_points : 0);
                DB::table('zone_progress')->insert([
                    'user_id' => $user->id,
                    'zone_id' => $zoneId,
                    'exchange_count' => $exchangeCount,
                    'unlocked_at' => $unlocked ? $now->copy()->subDays(1 + ($index + $zoneId) % 9) : null,
                ]);
            }
            $user->update(['points' => $points]);
            foreach ($going as $eventIndex) {
                DB::table('rsvps')->insertOrIgnore(['event_id' => $events[$eventIndex]->id, 'user_id' => $user->id]);
            }
            $rows[] = [$email, $name, $points, count(array_filter($progress, fn ($count, $zoneId) => $count >= $zones[$zoneId]->required_count, ARRAY_FILTER_USE_BOTH))];
        }

        $this->command?->table(['Event', 'Zone', 'Starts (UTC)'], array_map(
            fn (Event $event) => [$event->title, $event->zone_id, $event->starts_at->format('H:i')],
            $events,
        ));
        $this->command?->table(['Email', 'Name', 'Points', 'Zones open'], $rows);
    }
}
