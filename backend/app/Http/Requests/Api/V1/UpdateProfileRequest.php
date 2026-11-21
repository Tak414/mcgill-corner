<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'username' => ['sometimes', 'required', 'string', 'min:3', 'max:24', 'alpha_dash', Rule::unique('profiles', 'username')->ignore($this->user()->profile?->id)],
            'bio' => ['sometimes', 'nullable', 'string', 'max:240'],
            'university' => ['sometimes', 'nullable', 'string', 'max:120'],
            'program' => ['sometimes', 'nullable', 'string', 'max:120'],
            'year_of_study' => ['sometimes', 'nullable', 'integer', 'between:1,8'],
            'avatar_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'id' => ['prohibited'], 'user_id' => ['prohibited'], 'email' => ['prohibited'],
            'email_verified_at' => ['prohibited'], 'password' => ['prohibited'], 'role' => ['prohibited'],
            'xp' => ['prohibited'], 'level' => ['prohibited'], 'moderation_status' => ['prohibited'],
            'friend_mode' => ['prohibited'], 'dating_mode' => ['prohibited'], 'visibility_settings' => ['prohibited'],
        ];
    }
}
