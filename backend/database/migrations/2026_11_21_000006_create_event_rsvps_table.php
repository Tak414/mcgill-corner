<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_rsvps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('going');
            $table->timestamp('responded_at')->useCurrent();
            $table->timestamps();
            $table->unique(['user_id', 'event_id']);
            $table->index(['event_id', 'status']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE event_rsvps ADD CONSTRAINT event_rsvps_status_check CHECK (status IN ('going', 'interested', 'cancelled'))");
        } elseif (DB::getDriverName() === 'sqlite') {
            DB::statement("CREATE TRIGGER validate_event_rsvp_status_insert BEFORE INSERT ON event_rsvps WHEN NEW.status NOT IN ('going', 'interested', 'cancelled') BEGIN SELECT RAISE(ABORT, 'Invalid RSVP status'); END");
            DB::statement("CREATE TRIGGER validate_event_rsvp_status_update BEFORE UPDATE ON event_rsvps WHEN NEW.status NOT IN ('going', 'interested', 'cancelled') BEGIN SELECT RAISE(ABORT, 'Invalid RSVP status'); END");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('DROP TRIGGER IF EXISTS validate_event_rsvp_status_insert');
            DB::statement('DROP TRIGGER IF EXISTS validate_event_rsvp_status_update');
        }

        Schema::dropIfExists('event_rsvps');
    }
};
