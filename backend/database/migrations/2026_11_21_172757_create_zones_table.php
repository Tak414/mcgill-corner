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
        Schema::create('zones', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->unsignedTinyInteger('row');
            $table->unsignedTinyInteger('col');
            $table->double('south');
            $table->double('west');
            $table->double('north');
            $table->double('east');
            $table->unsignedTinyInteger('required_count');
            $table->unsignedSmallInteger('bonus_points');

            $table->unique(['row', 'col']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('zones');
    }
};
