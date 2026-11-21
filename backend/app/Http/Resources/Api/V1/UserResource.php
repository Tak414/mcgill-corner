<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'name' => $this->name,
            'email' => $this->email,
            'profile' => $this->whenLoaded('profile', fn () => (new ProfileResource($this->profile))->resolve($request)),
            'interests' => $this->whenLoaded('interests', fn () => InterestResource::collection($this->interests)->resolve($request)),
        ];
    }
}
