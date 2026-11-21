<?php

namespace App\Http\Requests\Api;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreEventRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'host';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:1', 'max:80'],
            'description' => ['sometimes', 'string', 'max:500'],
            'location_name' => ['required', 'string', 'min:1', 'max:120'],
            'address' => ['sometimes', 'nullable', 'string', 'max:200'],
            'lat' => [
                'required', 'numeric', 'gt:0',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_int($value) && ! is_float($value)) {
                        $fail('The lat field must be a JSON number.');
                    }
                },
            ],
            'lng' => [
                'required', 'numeric', 'lt:0',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_int($value) && ! is_float($value)) {
                        $fail('The lng field must be a JSON number.');
                    }
                },
            ],
            'starts_at' => ['required', 'date', 'after:now'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
        ];
    }

    /**
     * @return list<\Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (['starts_at', 'ends_at'] as $field) {
                $value = $this->input($field);
                if (is_string($value) && ! preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/D', $value)) {
                    $validator->errors()->add($field, 'The '.$field.' field must be an ISO 8601 date-time with an offset.');
                }
            }

            if ($validator->errors()->has('starts_at') || $validator->errors()->has('ends_at')) {
                return;
            }

            $startsAt = CarbonImmutable::parse($this->input('starts_at'));
            $endsAt = CarbonImmutable::parse($this->input('ends_at'));

            if ($endsAt->gt($startsAt->addHours(12))) {
                $validator->errors()->add('ends_at', 'The ends_at field must be no more than 12 hours after starts_at.');
            }
        }];
    }
}
