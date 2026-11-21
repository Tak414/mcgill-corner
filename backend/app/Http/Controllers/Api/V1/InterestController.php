<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateInterestsRequest;
use App\Http\Resources\Api\V1\InterestResource;
use App\Models\Interest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InterestController extends Controller
{
    public function index(): JsonResponse
    {
        $interests = Interest::query()->orderBy('category')->orderBy('name')->get();

        return response()->json(['success' => true, 'message' => 'Interests retrieved.', 'data' => InterestResource::collection($interests)->resolve()]);
    }

    public function selected(Request $request): JsonResponse
    {
        $interests = $request->user()->interests()->orderBy('category')->orderBy('name')->get();

        return response()->json(['success' => true, 'message' => 'Selected interests retrieved.', 'data' => InterestResource::collection($interests)->resolve()]);
    }

    public function update(UpdateInterestsRequest $request): JsonResponse
    {
        $user = $request->user();
        DB::transaction(fn () => $user->interests()->sync($request->validated('interests')));
        $interests = $user->interests()->orderBy('category')->orderBy('name')->get();

        return response()->json(['success' => true, 'message' => 'Interests updated.', 'data' => InterestResource::collection($interests)->resolve()]);
    }
}
