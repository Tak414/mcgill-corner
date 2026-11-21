<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\InterestController;
use App\Http\Controllers\Api\V1\ProfileController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1')->name('api.v1.')->group(function (): void {
    Route::post('/auth/register', [AuthController::class, 'register'])->name('auth.register');
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('auth.login');
    Route::get('/interests', [InterestController::class, 'index'])->name('interests.index');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
        Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::get('/profile/interests', [InterestController::class, 'selected'])->name('profile.interests.index');
        Route::put('/profile/interests', [InterestController::class, 'update'])->name('profile.interests.update');
    });
});
