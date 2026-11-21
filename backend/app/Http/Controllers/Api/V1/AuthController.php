<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Requests\Api\V1\RegisterRequest;
use App\Http\Resources\Api\V1\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request): User {
            $user = User::create($request->safe()->only(['name', 'email', 'password']));
            $base = Str::lower(Str::substr(Str::slug($user->name, ''), 0, 15)) ?: 'student';
            $username = $base.'-'.Str::lower(Str::random(8));
            $user->profile()->create(['username' => $username]);

            return $user;
        });

        return $this->tokenResponse($user, 'Account created.', 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = User::query()->where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['success' => false, 'message' => 'Invalid email or password.'], 401);
        }

        return $this->tokenResponse($user, 'Signed in.');
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json(['success' => true, 'message' => 'Signed out.', 'data' => null]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['profile', 'interests']);

        return response()->json(['success' => true, 'message' => 'Authenticated user.', 'data' => (new UserResource($user))->resolve($request)]);
    }

    private function tokenResponse(User $user, string $message, int $status = 200): JsonResponse
    {
        $user->load(['profile', 'interests']);
        $token = $user->createToken('auth-token', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => ['token' => $token, 'token_type' => 'Bearer', 'user' => (new UserResource($user))->resolve(request())],
        ], $status);
    }
}
