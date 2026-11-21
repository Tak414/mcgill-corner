<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateProfileRequest;
use App\Http\Resources\Api\V1\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['profile', 'interests']);

        return response()->json(['success' => true, 'message' => 'Profile retrieved.', 'data' => (new UserResource($user))->resolve($request)]);
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();
        DB::transaction(function () use ($data, $user): void {
            if (array_key_exists('name', $data)) {
                $user->name = $data['name'];
                $user->save();
            }

            $profileData = array_diff_key($data, ['name' => true]);
            if ($profileData !== []) {
                $user->profile()->updateOrCreate([], $profileData);
            }
        });
        $user->load(['profile', 'interests']);

        return response()->json(['success' => true, 'message' => 'Profile updated.', 'data' => (new UserResource($user))->resolve($request)]);
    }
}
