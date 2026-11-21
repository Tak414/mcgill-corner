<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('neighborhoods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->integer('difficulty')->default(1);

            if (DB::getDriverName() === 'sqlite') {
                $table->text('boundary')->nullable();
            }

            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');
            DB::statement("ALTER TABLE neighborhoods ADD COLUMN boundary geography(MultiPolygon, 4326)");
            DB::statement('CREATE INDEX neighborhoods_boundary_gist ON neighborhoods USING GIST (boundary)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('neighborhoods');
    }
};
