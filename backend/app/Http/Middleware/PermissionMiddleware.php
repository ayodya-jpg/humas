<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    /**
     * Memeriksa permission user sebelum mengakses route.
     *
     * Contoh satu permission:
     *
     * permission:products.view
     *
     * Contoh beberapa permission:
     *
     * permission:products.view,products.manage
     *
     * Beberapa permission memakai logika OR.
     * User cukup mempunyai salah satu permission.
     */
    public function handle(
        Request $request,
        Closure $next,
        string ...$permissions
    ): Response {
        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | User belum terautentikasi
        |--------------------------------------------------------------------------
        */

        if (!$user) {
            return $this
                ->unauthenticatedResponse();
        }

        /*
        |--------------------------------------------------------------------------
        | Superadmin mempunyai seluruh akses
        |--------------------------------------------------------------------------
        */

        if (
            method_exists(
                $user,
                'isSuperadmin'
            ) &&
            $user->isSuperadmin()
        ) {
            return $next(
                $request
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Normalisasi permission dari parameter middleware
        |--------------------------------------------------------------------------
        */

        $requiredPermissions =
            $this->normalizePermissions(
                $permissions
            );

        /*
        |--------------------------------------------------------------------------
        | Tidak ada permission yang dikonfigurasi
        |--------------------------------------------------------------------------
        */

        if (
            empty(
                $requiredPermissions
            )
        ) {
            return $this
                ->configurationErrorResponse(
                    'Permission route belum dikonfigurasi.'
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Validasi nama permission
        |--------------------------------------------------------------------------
        |
        | Mencegah typo pada routes/api.php seperti:
        |
        | permission:product.view
        |
        | Padahal permission yang benar:
        |
        | permission:products.view
        |
        */

        $invalidPermissions =
            array_values(
                array_diff(
                    $requiredPermissions,
                    User::AVAILABLE_PERMISSIONS
                )
            );

        if (
            !empty(
                $invalidPermissions
            )
        ) {
            return $this
                ->configurationErrorResponse(
                    'Terdapat permission route yang tidak terdaftar.',
                    $invalidPermissions
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Periksa permission user
        |--------------------------------------------------------------------------
        |
        | Logika OR:
        | user cukup mempunyai salah satu permission.
        |
        */

        if (
            !$this->userHasAnyPermission(
                $user,
                $requiredPermissions
            )
        ) {
            return $this
                ->forbiddenResponse(
                    $user,
                    $requiredPermissions
                );
        }

        return $next(
            $request
        );
    }

    /**
     * Menormalisasi seluruh parameter middleware.
     */
    private function normalizePermissions(
        array $permissions
    ): array {
        $normalizedPermissions =
            [];

        foreach (
            $permissions
            as $permissionGroup
        ) {
            if (
                !is_string(
                    $permissionGroup
                )
            ) {
                continue;
            }

            /*
             * Tetap pecah berdasarkan koma.
             *
             * Hal ini aman untuk dua kemungkinan:
             * - Laravel mengirim beberapa parameter;
             * - Laravel mengirim satu parameter berisi koma.
             */
            $permissionItems =
                explode(
                    ',',
                    $permissionGroup
                );

            foreach (
                $permissionItems
                as $permission
            ) {
                $permission =
                    trim(
                        $permission
                    );

                if (
                    $permission === ''
                ) {
                    continue;
                }

                $normalizedPermissions[] =
                    $permission;
            }
        }

        return array_values(
            array_unique(
                $normalizedPermissions
            )
        );
    }

    /**
     * Memeriksa apakah user mempunyai salah satu permission.
     */
    private function userHasAnyPermission(
        object $user,
        array $permissions
    ): bool {
        /*
         * Gunakan helper utama pada model User.
         */
        if (
            method_exists(
                $user,
                'hasAnyPermission'
            )
        ) {
            return (bool) $user
                ->hasAnyPermission(
                    $permissions
                );
        }

        /*
         * Fallback apabila model belum mempunyai hasAnyPermission.
         */
        foreach (
            $permissions
            as $permission
        ) {
            if (
                $this->userHasPermission(
                    $user,
                    $permission
                )
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Memeriksa satu permission sebagai fallback.
     */
    private function userHasPermission(
        object $user,
        string $permission
    ): bool {
        if (
            method_exists(
                $user,
                'hasPermission'
            )
        ) {
            return (bool) $user
                ->hasPermission(
                    $permission
                );
        }

        return in_array(
            $permission,
            $this->getUserPermissions(
                $user
            ),
            true
        );
    }

    /**
     * Mengambil daftar permission efektif user.
     */
    private function getUserPermissions(
        object $user
    ): array {
        /*
         * Gunakan helper utama pada model User.
         */
        if (
            method_exists(
                $user,
                'getPermissionList'
            )
        ) {
            $permissions =
                $user->getPermissionList();

            return $this
                ->cleanPermissionList(
                    $permissions
                );
        }

        /*
         * Fallback ke atribut permissions.
         */
        $permissions =
            $user->permissions ??
            [];

        /*
         * Antisipasi data lama yang masih berupa JSON string.
         */
        if (
            is_string(
                $permissions
            )
        ) {
            $decodedPermissions =
                json_decode(
                    $permissions,
                    true
                );

            $permissions =
                is_array(
                    $decodedPermissions
                )
                    ? $decodedPermissions
                    : [];
        }

        return $this
            ->cleanPermissionList(
                $permissions
            );
    }

    /**
     * Membersihkan daftar permission user.
     */
    private function cleanPermissionList(
        mixed $permissions
    ): array {
        if (
            !is_array(
                $permissions
            )
        ) {
            return [];
        }

        $cleanPermissions =
            [];

        foreach (
            $permissions
            as $permission
        ) {
            if (
                !is_string(
                    $permission
                )
            ) {
                continue;
            }

            $permission =
                trim(
                    $permission
                );

            if (
                $permission === ''
            ) {
                continue;
            }

            if (
                !in_array(
                    $permission,
                    User::AVAILABLE_PERMISSIONS,
                    true
                )
            ) {
                continue;
            }

            $cleanPermissions[] =
                $permission;
        }

        return array_values(
            array_unique(
                $cleanPermissions
            )
        );
    }

    /**
     * Response ketika user belum login.
     */
    private function unauthenticatedResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Unauthenticated. Silakan login terlebih dahulu.',
            'data' => null,
        ], 401);
    }

    /**
     * Response ketika konfigurasi permission route salah.
     */
    private function configurationErrorResponse(
        string $message,
        array $invalidPermissions = []
    ): JsonResponse {
        $data = null;

        /*
         * Detail konfigurasi hanya ditampilkan saat debugging.
         */
        if (
            config('app.debug')
        ) {
            $data = [
                'invalid_permissions' =>
                    $invalidPermissions,
            ];
        }

        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => $data,
        ], 500);
    }

    /**
     * Response ketika user tidak mempunyai akses.
     */
    private function forbiddenResponse(
        object $user,
        array $requiredPermissions
    ): JsonResponse {
        $data = null;

        /*
         * Detail permission hanya ditampilkan saat debugging.
         * Pada production, daftar permission akun tidak perlu dibocorkan.
         */
        if (
            config('app.debug')
        ) {
            $data = [
                'required_permissions' =>
                    $requiredPermissions,

                'user_permissions' =>
                    $this->getUserPermissions(
                        $user
                    ),
            ];
        }

        return response()->json([
            'success' => false,
            'message' => 'Akun tidak memiliki izin untuk mengakses fitur ini.',
            'data' => $data,
        ], 403);
    }
}