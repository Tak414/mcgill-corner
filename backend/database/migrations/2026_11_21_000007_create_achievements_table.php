<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('achievements', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->text('description');
            $table->string('icon')->nullable();
            $table->integer('xp_reward')->default(0);
            $table->timestamps();
        });

        Schema::create('user_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('achievement_id')->constrained()->cascadeOnDelete();
            $table->timestamp('earned_at')->useCurrent();
            $table->timestamps();
            $table->unique(['user_id', 'achievement_id']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE achievements ADD CONSTRAINT achievements_xp_reward_check CHECK (xp_reward >= 0)');
        } elseif (DB::getDriverName() === 'sqlite') {
            DB::statement('CREATE TRIGGER validate_achievement_xp_insert BEFORE INSERT ON achievements WHEN NEW.xp_reward < 0 BEGIN SELECT RAISE(ABORT, \'Achievement XP reward cannot be negative\'); END');
            DB::statement('CREATE TRIGGER validate_achievement_xp_update BEFORE UPDATE ON achievements WHEN NEW.xp_reward < 0 BEGIN SELECT RAISE(ABORT, \'Achievement XP reward cannot be negative\'); END');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('DROP TRIGGER IF EXISTS validate_achievement_xp_insert');
            DB::statement('DROP TRIGGER IF EXISTS validate_achievement_xp_update');
        }

        Schema::dropIfExists('user_achievements');
        Schema::dropIfExists('achievements');
    }
};
