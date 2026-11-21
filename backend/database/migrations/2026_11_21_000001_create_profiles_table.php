<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('username')->unique();
            $table->text('bio')->nullable();
            $table->string('university')->nullable();
            $table->string('avatar_url')->nullable();
            $table->boolean('friend_mode')->default(true);
            $table->boolean('dating_mode')->default(false);
            $table->json('visibility_settings')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
