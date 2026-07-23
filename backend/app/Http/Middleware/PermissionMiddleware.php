<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    /**
     * Memeriksa apakah user memiliki permission yang dibutuhkan.
     *
     * Contoh:
     * middleware('permission:products.view')
     *
     * Beberapa permission:
     * middleware('permission:products.view,products.manage')
     *
     * Secara default cukup memiliki salah satu permission.
     */
    public function handle(
        Request $request,
        Closure $next,
        string ...$permissions
    ): Response {
        $user = $request->user();

        if (!$user) {
            return $this->unauthenticatedResponse();
        }

        /*
        |--------------------------------------------------------------------------
        | Superadmin selalu mempunyai seluruh akses
        |--------------------------------------------------------------------------
        */

        if ($user->isSuperadmin()) {
            return $next($request);
        }

        /*
        |--------------------------------------------------------------------------
        | Middleware harus menerima minimal satu permission
        |--------------------------------------------------------------------------
        */

        if (empty($permissions)) {
            return response()->json([
                'success' => false,
                'message' => 'Permission route belum dikonfigurasi.',
                'data' => null,
            ], 500);
        }

        /*
        |--------------------------------------------------------------------------
        | User cukup mempunyai salah satu permission
        |--------------------------------------------------------------------------
        */

        if (!$user->hasAnyPermission($permissions)) {
            return response()->json([
                'success' => false,
                'message' => 'Akun tidak memiliki izin untuk mengakses fitur ini.',
                'data' => [
                    'required_permissions' => $permissions,
                    'user_permissions' => $user->getPermissionList(),
                ],
            ], 403);
        }

        return $next($request);
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
}