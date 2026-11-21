<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\User;
use App\Services\ZoneGrid;
use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $hosts = [
            User::query()->updateOrCreate(['email' => 'host1@unlock.test'], [
                'name' => 'UNLOCK Host One',
                'password' => 'host12345',
                'role' => 'host',
                'points' => 0,
            ]),
            User::query()->updateOrCreate(['email' => 'host2@unlock.test'], [
                'name' => 'UNLOCK Host Two',
                'password' => 'host12345',
                'role' => 'host',
                'points' => 0,
            ]),
        ];

        foreach (range(1, 6) as $number) {
            User::query()->updateOrCreate(['email' => "attendee{$number}@unlock.test"], [
                'name' => ['Alex Chen', 'Maya Singh', 'Noah Tremblay', 'Leila Haddad', 'Ethan Roy', 'Sofia Martin'][$number - 1],
                'password' => 'unlock123',
                'role' => 'attendee',
                'points' => 0,
            ]);
        }

        $now = now('UTC')->startOfMinute();
        $eventSpecs = [
            ['Board Games at McGill', 45.5048, -73.5772, 0, -1, 2],
            ['Coffee and Conversation', 45.5000, -73.5600, 1, -1, 2],
            ['Campus Walk', 45.5110, -73.5800, 0, 4, 6],
            ['Puzzle Night', 45.5180, -73.5940, 1, 5, 7],
            ['Study Break Meetup', 45.5200, -73.5600, 0, 25, 27],
            ['Outdoor Chess', 45.4900, -73.5800, 1, 26, 28],
            ['Neighbourhood Picnic', 45.5360, -73.6100, 0, 48, 50],
            ['Sunday Social', 45.4700, -73.5400, 1, 72, 74],
        ];
        $grid = app(ZoneGrid::class);
        $pins = [];

        foreach ($eventSpecs as [$title, $lat, $lng, $hostIndex, $startsInHours, $endsInHours]) {
            $location = $grid->locate($lat, $lng);
            $event = Event::query()->updateOrCreate(
                ['host_id' => $hosts[$hostIndex]->id, 'title' => $title],
                [
                    'description' => 'A casual UNLOCK community meetup.',
                    'location_name' => $title === 'Board Games at McGill' ? 'McGill University' : 'Montreal meetup spot',
                    'address' => null,
                    'lat' => $lat,
                    'lng' => $lng,
                    'zone_id' => $location['id'],
                    'starts_at' => $now->copy()->addHours($startsInHours),
                    'ends_at' => $now->copy()->addHours($endsInHours),
                ],
            );

            $pins[] = [
                'title' => $event->title,
                'lat' => number_format($event->lat, 4, '.', ''),
                'lng' => number_format($event->lng, 4, '.', ''),
                'zone_id' => $event->zone_id,
            ];
        }

        $this->command?->table(['Title', 'Lat', 'Lng', 'Zone ID'], $pins);
    }
}
