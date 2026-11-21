<?php

namespace App\Http\Resources\Api;

use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventSummaryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'location_name' => $this->location_name,
            'lat' => (float) $this->lat,
            'lng' => (float) $this->lng,
            'zone_id' => (int) $this->zone_id,
            'starts_at' => $this->toTorontoTime($this->starts_at),
            'ends_at' => $this->toTorontoTime($this->ends_at),
            'code_window' => $this->code_window ?? $this->codeWindow(),
            'going_count' => (int) $this->rsvps_count,
            'is_going' => (bool) $this->is_going,
            'host' => [
                'id' => (int) $this->host->id,
                'name' => $this->host->name,
            ],
        ];
    }

    protected function toTorontoTime(CarbonInterface $time): string
    {
        return $time->copy()->setTimezone('America/Toronto')->toIso8601String();
    }
}
