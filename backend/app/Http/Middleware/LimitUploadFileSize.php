<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

class LimitUploadFileSize
{
    /*
    |--------------------------------------------------------------------------
    | MAKSIMAL 5 MB PER FILE
    |--------------------------------------------------------------------------
    */

    private const MAX_BYTES = 5 * 1024 * 1024;

    /**
     * Membatasi ukuran semua file yang diunggah
     * melalui API HUMAS & SEKPiM.
     */
    public function handle(
        Request $request,
        Closure $next
    ): Response {
        $errors = [];

        $this->checkFiles(
            $request->allFiles(),
            '',
            $errors
        );

        /*
        |--------------------------------------------------------------------------
        | TOLAK FILE LEBIH DARI 5 MB
        |--------------------------------------------------------------------------
        */

        if ($errors !== []) {
            return response()->json([
                'success' => false,

                'message' =>
                    'Upload ditolak. Ukuran maksimal setiap file adalah 5 MB.',

                'errors' => $errors,
            ], 422);
        }

        return $next($request);
    }

    /**
     * Mendukung file tunggal dan array.
     *
     * Contoh:
     * - proof_file
     * - rundown
     * - tor
     * - gallery_files[0]
     * - handover_evidence
     * - return_evidence
     */
    private function checkFiles(
        array $files,
        string $prefix,
        array &$errors
    ): void {
        foreach ($files as $key => $file) {
            $field = $prefix === ''
                ? (string) $key
                : $prefix . '.' . $key;

            /*
            | Periksa nested file arrays.
            */

            if (is_array($file)) {
                $this->checkFiles(
                    $file,
                    $field,
                    $errors
                );

                continue;
            }

            if (!$file instanceof UploadedFile) {
                continue;
            }

            /*
            | Penanganan file yang ditolak PHP.
            */

            if (!$file->isValid()) {
                if (
                    in_array(
                        $file->getError(),
                        [
                            UPLOAD_ERR_INI_SIZE,
                            UPLOAD_ERR_FORM_SIZE,
                        ],
                        true
                    )
                ) {
                    $errors[$field] = [
                        'Ukuran file melebihi batas upload server. Maksimal 5 MB per file.',
                    ];
                }

                continue;
            }

            /*
            | Validasi ukuran file aktual.
            */

            $size = $file->getSize();

            if (
                $size !== false &&
                $size > self::MAX_BYTES
            ) {
                $errors[$field] = [
                    'Ukuran file ' .
                    $file->getClientOriginalName() .
                    ' melebihi 5 MB. Silakan pilih file yang lebih kecil.',
                ];
            }
        }
    }
}
