<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_exploration_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('neighborhood_id')->constrained()->cascadeOnDelete();
            $table->decimal('progress_percent', 5, 2)->default(0);
            $table->unsignedInteger('visit_count')->default(0);
            $table->timestamp('first_discovered_at')->nullable();
            $table->timestamp('last_visited_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'neighborhood_id']);
        });

        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            DB::statement('CREATE TRIGGER validate_exploration_progress_insert BEFORE INSERT ON user_exploration_progress WHEN NEW.progress_percent < 0 OR NEW.progress_percent > 100 BEGIN SELECT RAISE(ABORT, \'Progress must be between 0 and 100\'); END');
            DB::statement('CREATE TRIGGER validate_exploration_progress_update BEFORE UPDATE ON user_exploration_progress WHEN NEW.progress_percent < 0 OR NEW.progress_percent > 100 BEGIN SELECT RAISE(ABORT, \'Progress must be between 0 and 100\'); END');
        } elseif (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE user_exploration_progress ADD CONSTRAINT exploration_progress_percent_check CHECK (progress_percent >= 0 AND progress_percent <= 100)');
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            DB::statement('DROP TRIGGER IF EXISTS validate_exploration_progress_insert');
            DB::statement('DROP TRIGGER IF EXISTS validate_exploration_progress_update');
        }

        Schema::dropIfExists('user_exploration_progress');
    }
};
