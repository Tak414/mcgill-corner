<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organizer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('neighborhood_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description');
            $table->string('location_name');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->string('status')->default('draft')->index();
            $table->string('visibility')->default('university')->index();
            $table->unsignedInteger('capacity')->nullable();

            if (DB::getDriverName() === 'sqlite') {
                $table->text('location_point')->nullable();
            }

            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE events ADD COLUMN location_point geography(Point, 4326)");
            DB::statement('CREATE INDEX events_location_point_gist ON events USING GIST (location_point)');
            DB::statement("ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'published', 'cancelled', 'completed'))");
            DB::statement("ALTER TABLE events ADD CONSTRAINT events_visibility_check CHECK (visibility IN ('public', 'university', 'friends'))");
        } elseif (DB::getDriverName() === 'sqlite') {
            DB::statement("CREATE TRIGGER validate_event_status_insert BEFORE INSERT ON events WHEN NEW.status NOT IN ('draft', 'published', 'cancelled', 'completed') BEGIN SELECT RAISE(ABORT, 'Invalid event status'); END");
            DB::statement("CREATE TRIGGER validate_event_visibility_insert BEFORE INSERT ON events WHEN NEW.visibility NOT IN ('public', 'university', 'friends') BEGIN SELECT RAISE(ABORT, 'Invalid event visibility'); END");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('DROP TRIGGER IF EXISTS validate_event_status_insert');
            DB::statement('DROP TRIGGER IF EXISTS validate_event_visibility_insert');
        }

        Schema::dropIfExists('events');
    }
};
