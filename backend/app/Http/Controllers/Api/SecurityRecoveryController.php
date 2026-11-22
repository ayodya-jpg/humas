<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class SecurityRecoveryController extends Controller
{
    private const QUESTIONS = [
        1 => 'Siapa nama guru favorit Anda saat sekolah dasar?',
        2 => 'Apa nama hewan peliharaan pertama Anda?',
        3 => 'Apa nama panggilan Anda semasa kecil?',
        4 => 'Apa judul buku yang paling berkesan bagi Anda?',
        5 => 'Apa makanan favorit Anda semasa kecil?',
        6 => 'Apa nama permainan favorit Anda semasa kecil?',
        7 => 'Siapa karakter fiksi favorit Anda?',
        8 => 'Apa nama sahabat pertama Anda saat sekolah?',
    ];

    private const RECOVERY_HOURS = 24;
    private const MAX_ATTEMPTS_PER_HOUR = 5;

    private function questionOptions(): array
    {
        $questions = [];

        foreach (self::QUESTIONS as $id => $label) {
            $questions[] = [
                'id' => $id,
                'label' => $label,
            ];
        }

        return $questions;
    }

    private function normalizeAnswer(string $answer): string
    {
        $normalized = preg_replace(
            '/\s+/u',
            ' ',
            trim($answer)
        );

        return Str::lower(
            $normalized ?? trim($answer)
        );
    }

    private function recoveryCodeHash(string $code): string
    {
        return hash('sha256', $code);
    }

    private function requireSuperadmin(Request $request): void
    {
        abort_unless(
            $request->user()?->role === 'superadmin',
            403,
            'Hanya Superadmin yang dapat memproses pemulihan akun.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | PENGATURAN PERTANYAAN KEAMANAN
    |--------------------------------------------------------------------------
    */

    public function settings(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'questions' => $this->questionOptions(),
                'configured' => filled(
                    $user->security_answer_hash
                ),
                'question_id' =>
                    $user->security_question_id,
                'configured_at' =>
                    $user->security_question_set_at,
            ],
        ]);
    }

    public function saveQuestion(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => [
                'required',
                'string',
            ],
            'question_id' => [
                'required',
                'integer',
                'in:1,2,3,4,5,6,7,8',
            ],
            'answer' => [
                'required',
                'string',
                'min:8',
                'max:200',
            ],
        ]);

        $user = $request->user();

        if (
            !Hash::check(
                $data['current_password'],
                $user->password
            )
        ) {
            throw ValidationException::withMessages([
                'current_password' => [
                    'Password akun saat ini tidak sesuai.',
                ],
            ]);
        }

        DB::transaction(function () use (
            $user,
            $data
        ): void {
            $user->forceFill([
                'security_question_id' =>
                    (int) $data['question_id'],

                'security_answer_hash' =>
                    Hash::make(
                        $this->normalizeAnswer(
                            $data['answer']
                        )
                    ),

                'security_question_set_at' => now(),
            ])->save();

            DB::table('account_recovery_requests')
                ->where('user_id', $user->id)
                ->whereIn(
                    'status',
                    ['pending', 'approved']
                )
                ->update([
                    'status' => 'rejected',
                    'review_note' =>
                        'Dibatalkan karena pertanyaan keamanan diubah.',
                    'reviewed_at' => now(),
                    'updated_at' => now(),
                ]);
        });

        return response()->json([
            'success' => true,
            'message' =>
                'Pertanyaan keamanan berhasil disimpan.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | PENGAJUAN LUPA PASSWORD
    |--------------------------------------------------------------------------
    */

    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => [
                'required',
                'string',
                'max:100',
            ],
            'question_id' => [
                'required',
                'integer',
                'in:1,2,3,4,5,6,7,8',
            ],
            'answer' => [
                'required',
                'string',
                'max:200',
            ],
        ]);

        $username = trim($data['username']);

        /*
         * Kode acak juga dibuat jika data tidak cocok.
         * Dengan demikian response tidak mengungkap
         * apakah username atau jawaban terdaftar.
         */

        $code = bin2hex(random_bytes(32));

        $rateKey = 'recovery:attempts:' .
            hash('sha256', Str::lower($username));

        Cache::add(
            $rateKey,
            0,
            now()->addHour()
        );

        $attempts = Cache::increment($rateKey);

        if ($attempts <= self::MAX_ATTEMPTS_PER_HOUR) {
            $user = User::query()
                ->where('username', $username)
                ->first();

            $isValid = false;

            if (
                $user &&
                filled($user->security_answer_hash) &&
                $user->security_question_id !== null
            ) {
                /*
                 * PERBAIKAN PENTING:
                 *
                 * Konversi kedua ID menjadi integer
                 * sebelum dibandingkan.
                 *
                 * Tanpa ini, nilai "2" dari database
                 * bisa tidak cocok dengan integer 2.
                 */

                $questionMatches =
                    (int) $user->security_question_id ===
                    (int) $data['question_id'];

                $answerMatches = false;

                if ($questionMatches) {
                    $answerMatches = Hash::check(
                        $this->normalizeAnswer(
                            $data['answer']
                        ),
                        $user->security_answer_hash
                    );
                }

                $isValid =
                    $questionMatches && $answerMatches;
            }

            if ($isValid) {
                DB::transaction(function () use (
                    $user,
                    $code
                ): void {
                    DB::table('account_recovery_requests')
                        ->where('user_id', $user->id)
                        ->whereIn(
                            'status',
                            ['pending', 'approved']
                        )
                        ->update([
                            'status' => 'rejected',
                            'review_note' =>
                                'Digantikan permintaan baru.',
                            'reviewed_at' => now(),
                            'updated_at' => now(),
                        ]);

                    DB::table('account_recovery_requests')
                        ->insert([
                            'id' => (string) Str::uuid(),
                            'user_id' => $user->id,

                            'recovery_code_hash' =>
                                $this->recoveryCodeHash($code),

                            'status' => 'pending',

                            'expires_at' =>
                                now()->addHours(
                                    self::RECOVERY_HOURS
                                ),

                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                });
            }
        }

        return response()->json([
            'success' => true,
            'message' =>
                'Permintaan telah diterima untuk diperiksa. '
                . 'Simpan kode pemulihan dan tunggu verifikasi '
                . 'Superadmin. Permintaan hanya diproses '
                . 'apabila data keamanan sesuai.',
            'data' => [
                'recovery_code' => $code,
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | CEK STATUS PEMULIHAN
    |--------------------------------------------------------------------------
    */

    public function status(Request $request): JsonResponse
    {
        $data = $request->validate([
            'recovery_code' => [
                'required',
                'string',
                'size:64',
                'regex:/^[a-f0-9]+$/',
            ],
        ]);

        $row = DB::table('account_recovery_requests')
            ->where(
                'recovery_code_hash',
                $this->recoveryCodeHash(
                    $data['recovery_code']
                )
            )
            ->first();

        // Respons untuk kode tak dikenal tetap generik.
        $status = 'pending';

        if ($row) {
            $isExpired =
                now()->greaterThan($row->expires_at);

            $status = (
                $isExpired &&
                in_array(
                    $row->status,
                    ['pending', 'approved'],
                    true
                )
            )
                ? 'expired'
                : $row->status;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'status' => $status,
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | RESET PASSWORD SETELAH DISETUJUI
    |--------------------------------------------------------------------------
    */

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'recovery_code' => [
                'required',
                'string',
                'size:64',
                'regex:/^[a-f0-9]+$/',
            ],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)
                    ->mixedCase()
                    ->numbers(),
            ],
            'password_confirmation' => [
                'required',
                'string',
            ],
        ]);

        $updated = DB::transaction(function () use (
            $data
        ): bool {
            $row = DB::table('account_recovery_requests')
                ->where(
                    'recovery_code_hash',
                    $this->recoveryCodeHash(
                        $data['recovery_code']
                    )
                )
                ->lockForUpdate()
                ->first();

            if (
                !$row ||
                $row->status !== 'approved' ||
                now()->greaterThan($row->expires_at)
            ) {
                return false;
            }

            $user = User::query()
                ->lockForUpdate()
                ->find($row->user_id);

            if (!$user) {
                return false;
            }

            $user->forceFill([
                'password' => $data['password'],
                'remember_token' => Str::random(60),
            ])->save();

            // Cabut semua sesi Sanctum.
            $user->tokens()->delete();

            // Nonaktifkan token pemulihan email lama.
            DB::table('password_reset_tokens')
                ->where('email', $user->email)
                ->delete();

            DB::table('account_recovery_requests')
                ->where('id', $row->id)
                ->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('account_recovery_requests')
                ->where('user_id', $user->id)
                ->where('id', '!=', $row->id)
                ->whereIn(
                    'status',
                    ['pending', 'approved']
                )
                ->update([
                    'status' => 'rejected',
                    'review_note' =>
                        'Dibatalkan setelah password diperbarui.',
                    'reviewed_at' => now(),
                    'updated_at' => now(),
                ]);

            return true;
        });

        if (!$updated) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Pemulihan belum disetujui, '
                    . 'kode tidak valid, atau sudah kedaluwarsa.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' =>
                'Password berhasil diubah. '
                . 'Silakan login menggunakan password baru.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | DAFTAR PERMINTAAN - SUPERADMIN
    |--------------------------------------------------------------------------
    */

    public function adminIndex(Request $request): JsonResponse
    {
        $this->requireSuperadmin($request);

        $records = DB::table(
            'account_recovery_requests as r'
        )
            ->join(
                'users as u',
                'u.id',
                '=',
                'r.user_id'
            )
            ->leftJoin(
                'users as reviewer',
                'reviewer.id',
                '=',
                'r.reviewed_by'
            )
            ->select([
                'r.id',
                'r.status',
                'r.created_at',
                'r.expires_at',
                'r.reviewed_at',
                'r.completed_at',
                'r.review_note',
                'u.id as user_id',
                'u.name',
                'u.username',
                'u.role',
                'reviewer.name as reviewed_by_name',
            ])
            ->orderByRaw(
                "CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END"
            )
            ->orderByDesc('r.created_at')
            ->limit(100)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $records,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | KEPUTUSAN SUPERADMIN
    |--------------------------------------------------------------------------
    */

    public function decide(
        Request $request,
        string $id
    ): JsonResponse {
        $this->requireSuperadmin($request);

        $data = $request->validate([
            'action' => [
                'required',
                'in:approve,reject',
            ],
            'identity_verified' => [
                'nullable',
                'boolean',
            ],
            'note' => [
                'required',
                'string',
                'min:15',
                'max:2000',
            ],
        ]);

        if (
            $data['action'] === 'approve' &&
            !$request->boolean('identity_verified')
        ) {
            throw ValidationException::withMessages([
                'identity_verified' => [
                    'Identitas pemohon harus diverifikasi '
                    . 'sebelum disetujui.',
                ],
            ]);
        }

        $result = DB::transaction(function () use (
            $request,
            $id,
            $data
        ): string {
            $row = DB::table('account_recovery_requests')
                ->where('id', $id)
                ->lockForUpdate()
                ->first();

            if (
                !$row ||
                $row->status !== 'pending'
            ) {
                return 'not_pending';
            }

            if (
                now()->greaterThan($row->expires_at)
            ) {
                return 'expired';
            }

            if (
                (int) $row->user_id ===
                (int) $request->user()->id
            ) {
                return 'self_review';
            }

            DB::table('account_recovery_requests')
                ->where('id', $id)
                ->update([
                    'status' =>
                        $data['action'] === 'approve'
                            ? 'approved'
                            : 'rejected',

                    'reviewed_by' =>
                        $request->user()->id,

                    'review_note' =>
                        trim($data['note']),

                    'reviewed_at' => now(),
                    'updated_at' => now(),
                ]);

            return 'success';
        });

        if ($result !== 'success') {
            return response()->json([
                'success' => false,
                'message' => match ($result) {
                    'self_review' =>
                        'Superadmin tidak dapat menyetujui '
                        . 'pemulihan akunnya sendiri.',

                    'expired' =>
                        'Permintaan sudah kedaluwarsa.',

                    default =>
                        'Permintaan sudah diproses '
                        . 'atau tidak ditemukan.',
                },
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' =>
                $data['action'] === 'approve'
                    ? 'Permintaan disetujui. Pengguna dapat '
                        . 'membuat password baru dengan kode miliknya.'
                    : 'Permintaan ditolak.',
        ]);
    }
}
