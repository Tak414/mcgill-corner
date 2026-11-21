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
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('host_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 80);
            $table->string('description', 500)->default('');
            $table->string('location_name', 120);
            $table->string('address', 200)->nullable();
            $table->double('lat');
            $table->double('lng');
            $table->unsignedTinyInteger('zone_id');
            $table->foreign('zone_id')->references('id')->on('zones')->restrictOnDelete();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
