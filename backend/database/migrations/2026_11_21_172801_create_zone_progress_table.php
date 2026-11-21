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
        Schema::create('zone_progress', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('zone_id');
            $table->foreign('zone_id')->references('id')->on('zones')->cascadeOnDelete();
            $table->unsignedInteger('exchange_count')->default(0);
            $table->dateTime('unlocked_at')->nullable();
            $table->primary(['user_id', 'zone_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('zone_progress');
    }
};
