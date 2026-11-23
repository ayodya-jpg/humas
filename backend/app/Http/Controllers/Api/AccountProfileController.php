<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AccountProfileController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | AUTHORIZATION
    |--------------------------------------------------------------------------
    |
    | Pengelolaan profil pengguna lain hanya
    | dapat dilakukan oleh Superadmin.
    |
    */

    private function requireSuperadmin(Request $request): void
    {
        abort_unless(
            $request->user()?->role === 'superadmin',
            403,
            'Hanya Superadmin yang dapat mengelola akun pengguna lain.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | FORMAT DATA PROFIL
    |--------------------------------------------------------------------------
    */

    private function profile(User $user): array
    {
        $extra = DB::table('account_profiles')
            ->where('user_id', $user->id)
            ->first();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,

            'phone_number' =>
                $extra?->phone_number ?? '',

            'unit_name' =>
                $extra?->unit_name ?? '',

            'job_title' =>
                $extra?->job_title ?? '',

            'role' => $user->role,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALISASI FIELD OPSIONAL
    |--------------------------------------------------------------------------
    */

    private function optionalText(?string $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }

    /*
    |--------------------------------------------------------------------------
    | PROSES SIMPAN PROFIL
    |--------------------------------------------------------------------------
    |
    | Whitelist field yang diizinkan:
    |
    | - name
    | - email
    | - phone_number
    | - unit_name
    | - job_title
    |
    | Username, role, permission, dan password
    | tidak dapat diubah menggunakan endpoint ini.
    |
    */

    private function save(
        Request $request,
        User $target,
        bool $isSelf
    ): JsonResponse {

        /*
        |--------------------------------------------------------------------------
        | VALIDASI DATA
        |--------------------------------------------------------------------------
        */

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'min:3',
                'max:255',
            ],

            'email' => [
                'required',
                'email',
                'max:255',

                Rule::unique('users', 'email')
                    ->ignore($target->id),
            ],

            'phone_number' => [
                'nullable',
                'string',
                'max:30',
                'regex:/^\+?[0-9][0-9\s().-]{5,29}$/',
            ],

            'unit_name' => [
                'nullable',
                'string',
                'max:150',
            ],

            'job_title' => [
                'nullable',
                'string',
                'max:150',
            ],

            'current_password' => [
                'required',
                'string',
            ],
        ], [
            'phone_number.regex' =>
                'Format nomor HP tidak valid.',

            'current_password.required' =>
                'Masukkan password akun yang sedang login.',
        ]);

        /*
        |--------------------------------------------------------------------------
        | VERIFIKASI PASSWORD AKTOR
        |--------------------------------------------------------------------------
        |
        | Password yang diperiksa adalah password
        | pengguna yang sedang login.
        |
        | Jika Superadmin mengubah akun lain,
        | yang diperiksa adalah password Superadmin,
        | bukan password akun tujuan.
        |
        */

        $actor = $request->user();

        if (
            !Hash::check(
                $data['current_password'],
                $actor->password
            )
        ) {
            throw ValidationException::withMessages([
                'current_password' => [
                    'Password akun yang sedang login salah.',
                ],
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | NORMALISASI INPUT
        |--------------------------------------------------------------------------
        */

        $newEmail = strtolower(
            trim($data['email'])
        );

        $newProfile = [
            'phone_number' => $this->optionalText(
                $data['phone_number'] ?? null
            ),

            'unit_name' => $this->optionalText(
                $data['unit_name'] ?? null
            ),

            'job_title' => $this->optionalText(
                $data['job_title'] ?? null
            ),
        ];

        $emailChanged = false;
        $changedFields = [];

        /*
        |--------------------------------------------------------------------------
        | DATABASE TRANSACTION
        |--------------------------------------------------------------------------
        |
        | Semua perubahan dilakukan dalam satu transaksi.
        |
        | Jika satu proses gagal, perubahan lain
        | dalam transaksi akan dibatalkan.
        |
        */

        DB::transaction(function () use (
            $request,
            $target,
            $actor,
            $newEmail,
            $data,
            $newProfile,
            $isSelf,
            &$emailChanged,
            &$changedFields
        ): void {

            /*
             * Kunci baris user selama transaksi
             * untuk menjaga konsistensi perubahan.
             */

            $locked = User::query()
                ->lockForUpdate()
                ->findOrFail($target->id);

            /*
             * Ambil data profil sebelumnya.
             */

            $oldProfile = DB::table('account_profiles')
                ->where('user_id', $locked->id)
                ->first();

            $changes = [];

            $newName = trim($data['name']);

            /*
            |--------------------------------------------------------------------------
            | DETEKSI FIELD YANG BERUBAH
            |--------------------------------------------------------------------------
            */

            if ($newName !== $locked->name) {
                $changes[] = 'name';
            }

            $emailChanged =
                $newEmail !== strtolower(
                    (string) $locked->email
                );

            if ($emailChanged) {
                $changes[] = 'email';
            }

            foreach ($newProfile as $field => $value) {
                if (
                    $value !==
                    ($oldProfile?->$field ?? null)
                ) {
                    $changes[] = $field;
                }
            }

            /*
            |--------------------------------------------------------------------------
            | SIMPAN DATA USER
            |--------------------------------------------------------------------------
            */

            $locked->forceFill([
                'name' => $newName,
                'email' => $newEmail,
            ]);

            /*
             * Jika email berubah, status verifikasi
             * email sebelumnya tidak berlaku.
             */

            if ($emailChanged) {
                $locked->email_verified_at = null;
            }

            $locked->save();

            /*
            |--------------------------------------------------------------------------
            | SIMPAN DATA PROFIL TAMBAHAN
            |--------------------------------------------------------------------------
            |
            | Jika profil belum ada, buat profil baru.
            | Jika sudah ada, perbarui data.
            |
            */

            DB::table('account_profiles')->upsert(
                [
                    [
                        'user_id' => $locked->id,

                        ...$newProfile,

                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                ],
                ['user_id'],
                [
                    'phone_number',
                    'unit_name',
                    'job_title',
                    'updated_at',
                ]
            );

            /*
            |--------------------------------------------------------------------------
            | ACCOUNT AUDIT LOG
            |--------------------------------------------------------------------------
            |
            | Hanya mencatat nama field yang berubah.
            |
            | Nilai pribadi, password, token,
            | dan jawaban keamanan tidak disimpan.
            |
            */

            if ($changes !== []) {
                DB::table('account_audit_logs')
                    ->insert([
                        'actor_user_id' =>
                            $actor->id,

                        'subject_user_id' =>
                            $locked->id,

                        'event' => $isSelf
                            ? 'profile.self.updated'
                            : 'profile.admin.updated',

                        'changed_fields' =>
                            json_encode(
                                $changes,
                                JSON_THROW_ON_ERROR
                            ),

                        'ip_address' =>
                            $request->ip(),

                        'user_agent' =>
                            substr(
                                (string) $request->userAgent(),
                                0,
                                255
                            ),

                        'created_at' => now(),
                    ]);
            }

            /*
            |--------------------------------------------------------------------------
            | CABUT TOKEN JIKA EMAIL BERUBAH
            |--------------------------------------------------------------------------
            |
            | Perubahan email termasuk perubahan
            | identitas yang sensitif.
            |
            | Semua token login akun tujuan dicabut
            | sehingga akun harus login ulang.
            |
            */

            if ($emailChanged) {
                $locked->tokens()->delete();
            }

            $changedFields = $changes;
        });

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'success' => true,

            'message' => $emailChanged
                ? 'Profil diperbarui. Karena email berubah, akun terkait harus login ulang.'
                : 'Profil akun berhasil diperbarui.',

            'data' => $this->profile(
                $target->fresh()
            ),

            'session_revoked' =>
                $emailChanged &&
                $actor->id === $target->id,

            'changed_fields' =>
                $changedFields,

        ])->header(
            'Cache-Control',
            'no-store'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | GET PROFIL SENDIRI
    |--------------------------------------------------------------------------
    |
    | GET /api/account/profile
    |
    */

    public function showMine(
        Request $request
    ): JsonResponse {

        return response()->json([
            'success' => true,

            'data' => $this->profile(
                $request->user()
            ),

        ])->header(
            'Cache-Control',
            'no-store'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE PROFIL SENDIRI
    |--------------------------------------------------------------------------
    |
    | PUT /api/account/profile
    |
    */

    public function updateMine(
        Request $request
    ): JsonResponse {

        return $this->save(
            $request,
            $request->user(),
            true
        );
    }

    /*
    |--------------------------------------------------------------------------
    | LIST PROFIL SEMUA USER
    |--------------------------------------------------------------------------
    |
    | GET /api/admin/user-profiles
    |
    | Hanya Superadmin.
    |
    */

    public function index(
        Request $request
    ): JsonResponse {

        $this->requireSuperadmin(
            $request
        );

        /*
         * Join digunakan untuk menghindari
         * query profil satu per satu.
         */

        $rows = DB::table('users as u')
            ->leftJoin(
                'account_profiles as p',
                'p.user_id',
                '=',
                'u.id'
            )
            ->select([
                'u.id',
                'u.name',
                'u.username',
                'u.email',
                'u.role',

                'p.phone_number',
                'p.unit_name',
                'p.job_title',
            ])
            ->orderBy('u.name')
            ->get();

        return response()->json([
            'success' => true,

            'data' => $rows,

        ])->header(
            'Cache-Control',
            'no-store'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE PROFIL USER OLEH SUPERADMIN
    |--------------------------------------------------------------------------
    |
    | PUT /api/admin/user-profiles/{user}
    |
    | User biasa tidak dapat memanggil
    | endpoint ini untuk mengubah akun lain.
    |
    */

    public function updateUser(
        Request $request,
        User $user
    ): JsonResponse {

        $this->requireSuperadmin(
            $request
        );

        return $this->save(
            $request,
            $user,

            (int) $request->user()->id ===
            (int) $user->id
        );
    }
}
