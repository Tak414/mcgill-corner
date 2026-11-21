<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('exchanges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_low_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('user_high_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('low_confirmed')->default(false);
            $table->boolean('high_confirmed')->default(false);
            $table->dateTime('completed_at')->nullable();
            $table->unsignedInteger('low_points_gained')->default(0);
            $table->unsignedInteger('high_points_gained')->default(0);
            $table->boolean('low_unlocked_now')->default(false);
            $table->boolean('high_unlocked_now')->default(false);
            $table->unique(['event_id', 'user_low_id', 'user_high_id']);
            $table->index(['event_id', 'completed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exchanges');
    }
};
