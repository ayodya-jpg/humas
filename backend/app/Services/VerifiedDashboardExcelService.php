<?php

namespace App\Services;

use Illuminate\Support\Collection;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;
use ZipArchive;

/**
 * Validasi struktur XLSX sebelum file dikirim ke browser.
 * Seluruh worksheet dan format dari DashboardExcelService tetap digunakan.
 */
class VerifiedDashboardExcelService extends DashboardExcelService
{
    public function download(
        Collection $requests,
        array $summary,
        array $filters,
        array $report = []
    ): StreamedResponse {
        $originalResponse = parent::download(
            $requests,
            $summary,
            $filters,
            $report
        );

        $temporaryPath = tempnam(
            sys_get_temp_dir(),
            'humas_xlsx_'
        );

        if ($temporaryPath === false) {
            throw new RuntimeException(
                'Folder sementara untuk export Excel tidak tersedia.'
            );
        }

        try {
            $this->writeStreamToFile(
                $originalResponse,
                $temporaryPath
            );

            $this->assertValidWorkbook($temporaryPath);
        } catch (Throwable $error) {
            @unlink($temporaryPath);
            report($error);

            throw new RuntimeException(
                'Export Excel gagal dibuat. File yang rusak tidak akan dikirim. '
                . $error->getMessage(),
                0,
                $error
            );
        }

        $start = preg_replace(
            '/[^0-9-]/',
            '',
            (string) ($filters['start_date'] ?? now()->subDays(29)->toDateString())
        );

        $end = preg_replace(
            '/[^0-9-]/',
            '',
            (string) ($filters['end_date'] ?? now()->toDateString())
        );

        $filename = sprintf(
            'Laporan_Dashboard_HUMAS_SEKPIM_%s_sd_%s.xlsx',
            $start,
            $end
        );

        return response()->streamDownload(
            static function () use ($temporaryPath): void {
                try {
                    $file = @fopen($temporaryPath, 'rb');

                    if ($file === false) {
                        throw new RuntimeException(
                            'File Excel sementara tidak dapat dibaca.'
                        );
                    }

                    try {
                        while (!feof($file)) {
                            $chunk = fread($file, 64 * 1024);

                            if ($chunk === false) {
                                throw new RuntimeException(
                                    'Gagal membaca file Excel sementara.'
                                );
                            }

                            echo $chunk;

                            if (connection_aborted()) {
                                break;
                            }
                        }
                    } finally {
                        fclose($file);
                    }
                } finally {
                    @unlink($temporaryPath);
                }
            },
            $filename,
            [
                'Content-Type' =>
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control' =>
                    'private, no-store, no-cache, must-revalidate',
                'X-Content-Type-Options' => 'nosniff',
            ]
        );
    }

    /**
     * Menangkap output PhpSpreadsheet ke disk sementara.
     * Tidak menyimpan seluruh XLSX di RAM.
     */
    private function writeStreamToFile(
        StreamedResponse $originalResponse,
        string $temporaryPath
    ): void {
        $handle = @fopen($temporaryPath, 'wb');

        if ($handle === false) {
            throw new RuntimeException(
                'Tidak dapat membuat file Excel sementara.'
            );
        }

        $initialBufferLevel = ob_get_level();
        $writeFailed = false;
        $streamError = null;

        ob_start(
            static function (string $chunk) use (
                $handle,
                &$writeFailed
            ): string {
                $total = strlen($chunk);
                $offset = 0;

                while ($offset < $total) {
                    $written = @fwrite(
                        $handle,
                        substr($chunk, $offset)
                    );

                    if ($written === false || $written === 0) {
                        $writeFailed = true;
                        break;
                    }

                    $offset += $written;
                }

                return '';
            },
            8192
        );

        try {
            $originalResponse->sendContent();
        } catch (Throwable $error) {
            $streamError = $error;
        } finally {
            while (ob_get_level() > $initialBufferLevel) {
                ob_end_flush();
            }

            fclose($handle);
        }

        if ($streamError !== null) {
            throw $streamError;
        }

        if ($writeFailed) {
            throw new RuntimeException(
                'File Excel sementara tidak dapat ditulis dengan lengkap.'
            );
        }
    }

    /**
     * XLSX harus berbentuk ZIP dengan struktur workbook yang lengkap.
     */
    private function assertValidWorkbook(string $path): void
    {
        if (!is_file($path) || (filesize($path) ?: 0) < 200) {
            throw new RuntimeException(
                'Hasil export kosong atau terlalu kecil untuk sebuah XLSX.'
            );
        }

        $header = @file_get_contents(
            $path,
            false,
            null,
            0,
            4
        );

        if ($header !== "PK\x03\x04") {
            throw new RuntimeException(
                'Isi export bukan file XLSX (header ZIP tidak ditemukan).'
            );
        }

        if (!class_exists(ZipArchive::class)) {
            throw new RuntimeException(
                'Ekstensi PHP ZIP belum aktif.'
            );
        }

        $zip = new ZipArchive();
        $result = $zip->open($path, ZipArchive::CHECKCONS);

        if ($result !== true) {
            throw new RuntimeException(
                'Struktur ZIP pada file Excel tidak valid.'
            );
        }

        try {
            if (
                $zip->locateName('[Content_Types].xml') === false ||
                $zip->locateName('xl/workbook.xml') === false ||
                $zip->locateName('xl/worksheets/sheet1.xml') === false
            ) {
                throw new RuntimeException(
                    'Struktur workbook Excel tidak lengkap.'
                );
            }
        } finally {
            $zip->close();
        }
    }
}
