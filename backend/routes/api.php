<?php

use App\Http\Controllers\Api\AccountDataController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\EventRsvpController;
use App\Http\Controllers\Api\ExchangeController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->name('register');
Route::post('/login', [AuthController::class, 'login'])->name('login');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/me', [AccountDataController::class, 'me'])->name('me');
    Route::get('/me/exchanges', [AccountDataController::class, 'exchanges'])->name('me.exchanges');
    Route::get('/zones', [AccountDataController::class, 'zones'])->name('zones.index');
    Route::get('/leaderboard', [AccountDataController::class, 'leaderboard'])->name('leaderboard');
    Route::get('/host/events', [AccountDataController::class, 'hostEvents'])->name('host.events');
    Route::get('/events', [EventController::class, 'index'])->name('events.index');
    Route::post('/events', [EventController::class, 'store'])->name('events.store');
    Route::get('/events/{event}', [EventController::class, 'show'])->name('events.show');
    Route::post('/events/{event}/rsvp', [EventRsvpController::class, 'store'])->name('events.rsvp.store');
    Route::delete('/events/{event}/rsvp', [EventRsvpController::class, 'destroy'])->name('events.rsvp.destroy');
    Route::post('/events/{event}/exchange', [ExchangeController::class, 'store'])->name('events.exchange.store');
});
