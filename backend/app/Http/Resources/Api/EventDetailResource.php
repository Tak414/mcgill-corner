<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;

class EventDetailResource extends EventSummaryResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'description' => $this->description,
            'address' => $this->address,
            'code_available_at' => $this->toTorontoTime($this->codeAvailableAt()),
            'my_code' => $this->my_code,
            'can_cancel' => (bool) $this->can_cancel,
            'pending_from' => $this->pending_from,
            'people_met_here' => $this->people_met_here,
        ];
    }
}
