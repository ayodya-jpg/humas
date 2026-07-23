<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Mengisi permission default untuk seluruh akun lama.
     */
    public function up(): void
    {
        User::query()
            ->orderBy('id')
            ->chunkById(
                100,
                function ($users): void {
                    foreach ($users as $user) {
                        /*
                        |--------------------------------------------------------------------------
                        | Superadmin selalu mendapatkan seluruh akses
                        |--------------------------------------------------------------------------
                        */

                        if ($user->role === 'superadmin') {
                            $user->forceFill([
                                'permissions' => User::AVAILABLE_PERMISSIONS,
                            ])->save();

                            continue;
                        }

                        /*
                        |--------------------------------------------------------------------------
                        | Pertahankan permission yang sudah pernah diatur
                        |--------------------------------------------------------------------------
                        |
                        | Jika permission sudah berupa array dan tidak kosong,
                        | migration tidak akan menimpanya.
                        |
                        */

                        if (
                            is_array($user->permissions) &&
                            count($user->permissions) > 0
                        ) {
                            $user->forceFill([
                                'permissions' => User::normalizePermissions(
                                    $user->permissions,
                                    $user->role
                                ),
                            ])->save();

                            continue;
                        }

                        /*
                        |--------------------------------------------------------------------------
                        | Isi permission default berdasarkan role
                        |--------------------------------------------------------------------------
                        */

                        $user->forceFill([
                            'permissions' => User::defaultPermissionsForRole(
                                $user->role
                            ),
                        ])->save();
                    }
                }
            );
    }

    /**
     * Rollback tidak menghapus permission.
     *
     * Data hak akses sengaja dipertahankan agar rollback migration
     * tidak menyebabkan seluruh akun kehilangan akses.
     */
    public function down(): void
    {
        //
    }
};