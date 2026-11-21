<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('xp_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('amount');
            $table->string('reason');
            $table->string('source_type')->nullable();
            $table->unsignedBigInteger('source_id')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'created_at']);
        });

        if (DB::getDriverName() === 'sqlite') {
            DB::statement(<<<'SQL'
CREATE TRIGGER prevent_negative_xp_insert
BEFORE INSERT ON xp_transactions
FOR EACH ROW
WHEN COALESCE((SELECT SUM(amount) FROM xp_transactions WHERE user_id = NEW.user_id), 0) + NEW.amount < 0
BEGIN
    SELECT RAISE(ABORT, 'XP balance cannot be negative');
END
SQL);
            DB::statement(<<<'SQL'
CREATE TRIGGER prevent_xp_update
BEFORE UPDATE ON xp_transactions
BEGIN
    SELECT RAISE(ABORT, 'XP transactions are immutable');
END
SQL);
            DB::statement(<<<'SQL'
CREATE TRIGGER prevent_xp_delete
BEFORE DELETE ON xp_transactions
BEGIN
    SELECT RAISE(ABORT, 'XP transactions are immutable');
END
SQL);
        } elseif (DB::getDriverName() === 'pgsql') {
            DB::statement(<<<'SQL'
CREATE FUNCTION check_xp_transaction() RETURNS trigger AS $$
BEGIN
    IF (SELECT COALESCE(SUM(amount), 0) FROM xp_transactions WHERE user_id = NEW.user_id) + NEW.amount < 0 THEN
        RAISE EXCEPTION 'XP balance cannot be negative';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SQL);
            DB::statement(<<<'SQL'
CREATE TRIGGER xp_transaction_balance_guard
BEFORE INSERT ON xp_transactions
FOR EACH ROW EXECUTE FUNCTION check_xp_transaction()
SQL);
            DB::statement(<<<'SQL'
CREATE FUNCTION prevent_xp_transaction_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'XP transactions are immutable';
END;
$$ LANGUAGE plpgsql
SQL);
            DB::statement(<<<'SQL'
CREATE TRIGGER xp_transaction_immutability_update
BEFORE UPDATE ON xp_transactions
FOR EACH ROW EXECUTE FUNCTION prevent_xp_transaction_mutation()
SQL);
            DB::statement(<<<'SQL'
CREATE TRIGGER xp_transaction_immutability_delete
BEFORE DELETE ON xp_transactions
FOR EACH ROW EXECUTE FUNCTION prevent_xp_transaction_mutation()
SQL);
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('DROP TRIGGER IF EXISTS prevent_negative_xp_insert');
            DB::statement('DROP TRIGGER IF EXISTS prevent_xp_update');
            DB::statement('DROP TRIGGER IF EXISTS prevent_xp_delete');
        } elseif (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP TRIGGER IF EXISTS xp_transaction_balance_guard ON xp_transactions');
            DB::statement('DROP TRIGGER IF EXISTS xp_transaction_immutability_update ON xp_transactions');
            DB::statement('DROP TRIGGER IF EXISTS xp_transaction_immutability_delete ON xp_transactions');
            DB::statement('DROP FUNCTION IF EXISTS check_xp_transaction');
            DB::statement('DROP FUNCTION IF EXISTS prevent_xp_transaction_mutation');
        }

        Schema::dropIfExists('xp_transactions');
    }
};
