<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\HumasPasswordResetNotification;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Throwable;

class PasswordRecoveryController extends Controller
{
    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => [
                'required',
                'string',
                'max:100',
            ],
        ], [
            'username.required' => 'Username wajib diisi.',
        ]);

        $user = User::query()
            ->where('username', trim($validated['username']))
            ->first();

        if ($user && filled($user->email)) {
            try {
                Password::broker('users')->sendResetLink(
                    ['email' => $user->email],
                    function (User $account, string $token) {
                        $account->notify(
                            new HumasPasswordResetNotification($token)
                        );

                        return Password::RESET_LINK_SENT;
                    }
                );
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        return response()->json([
            'success' => true,
            'message' =>
                'Jika username terdaftar dan memiliki email aktif, '
                . 'tautan reset password akan dikirim ke email akun tersebut.',
            'data' => null,
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => [
                'required',
                'string',
            ],

            'email' => [
                'required',
                'email',
                'max:255',
            ],

            'password' => [
                'required',
                'string',
                'confirmed',
                PasswordRule::min(8)
                    ->mixedCase()
                    ->numbers(),
            ],

            'password_confirmation' => [
                'required',
                'string',
            ],
        ], [
            'token.required' =>
                'Token reset password tidak tersedia.',

            'email.required' =>
                'Email akun wajib diisi.',

            'email.email' =>
                'Format email tidak valid.',

            'password.required' =>
                'Password baru wajib diisi.',

            'password.confirmed' =>
                'Konfirmasi password tidak sesuai.',

            'password_confirmation.required' =>
                'Konfirmasi password wajib diisi.',
        ]);

        $status = Password::broker('users')->reset(
            [
                'email' => $validated['email'],
                'token' => $validated['token'],
                'password' => $validated['password'],
                'password_confirmation' =>
                    $validated['password_confirmation'],
            ],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                // Cabut semua token login Sanctum.
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Tautan reset password tidak valid atau sudah kedaluwarsa. '
                    . 'Silakan meminta tautan baru.',
                'data' => null,
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' =>
                'Password berhasil diperbarui. '
                . 'Silakan login menggunakan password baru.',
            'data' => null,
        ]);
    }
}
