
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->unsignedSmallInteger('security_question_id')->nullable();
            $table->string('security_answer_hash')->nullable();
            $table->timestamp('security_question_set_at')->nullable();
        });

        Schema::create('account_recovery_requests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->char('recovery_code_hash', 64)->unique();
            $table->string('status', 20)->default('pending')->index();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_note')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_recovery_requests');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'security_question_id',
                'security_answer_hash',
                'security_question_set_at',
            ]);
        });
    }
};
