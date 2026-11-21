<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProfileResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'username' => $this->username, 'bio' => $this->bio,
            'university' => $this->university, 'program' => $this->program,
            'year_of_study' => $this->year_of_study, 'avatar_url' => $this->avatar_url,
            'friend_mode' => $this->friend_mode, 'dating_mode' => $this->dating_mode,
            'visibility_settings' => $this->visibility_settings,
        ];
    }
}
