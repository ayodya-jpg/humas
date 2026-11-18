<?php

namespace App\Services;

use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\IOFactory;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;
use ZipArchive;

/**
 * Menjaga agar laporan Dashboard tidak dikirim sebagai XLSX rusak.
 * Semua isi sheet tetap dibuat oleh DashboardExcelService.
 */
class VerifiedDashboardExcelService extends DashboardExcelService
{
    public function download(
        Collection $requests,
        array $summary,
        array $filters,
        array $report = []
    ): StreamedResponse {
        $original = parent::download(
            $requests,
            $summary,
            $filters,
            $report
        );

        if (!($original instanceof StreamedResponse)) {
            throw new RuntimeException(
                'Generator dashboard tidak menghasilkan stream Excel.'
            );
        }

        $directory = storage_path('app');

        if (!is_dir($directory) || !is_writable($directory)) {
            throw new RuntimeException(
                'Folder storage/app Laravel tidak bisa ditulis.'
            );
        }

        $tempFile = tempnam($directory, 'humas_excel_');

        if ($tempFile === false) {
            throw new RuntimeException(
                'Tidak dapat membuat file sementara Excel.'
            );
        }

        try {
            $this->saveOriginalStream($original, $tempFile);
            $this->verifyXlsx($tempFile);
        } catch (Throwable $error) {
            @unlink($tempFile);
            report($error);

            throw new RuntimeException(
                'Export Excel gagal. File tidak valid sehingga download ' .
                'dibatalkan. Penyebab: ' . $error->getMessage(),
                0,
                $error
            );
        }

        $start = preg_replace(
            '/[^0-9-]/',
            '',
            (string) ($filters['start_date'] ?? now()->toDateString())
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

        clearstatcache(true, $tempFile);
        $size = filesize($tempFile);

        /*
        |--------------------------------------------------------------------------
        | KIRIM FILE YANG SUDAH DIVALIDASI
        |--------------------------------------------------------------------------
        |
        | StreamedResponse kompatibel dengan versi controller
        | yang mengembalikan Response maupun StreamedResponse.
        |
        */

        return response()->streamDownload(
            static function () use ($tempFile): void {
                $handle = null;

                try {
                    $handle = @fopen($tempFile, 'rb');

                    if ($handle === false) {
                        throw new RuntimeException(
                            'File Excel hasil validasi tidak dapat dibaca.'
                        );
                    }

                    while (!feof($handle)) {
                        $chunk = fread($handle, 64 * 1024);

                        if ($chunk === false) {
                            throw new RuntimeException(
                                'Terjadi kesalahan saat membaca file Excel.'
                            );
                        }

                        echo $chunk;
                    }
                } finally {
                    if (is_resource($handle)) {
                        fclose($handle);
                    }

                    @unlink($tempFile);
                }
            },
            $filename,
            [
                'Content-Type' =>
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

                'Content-Length' =>
                    (string) $size,

                'Cache-Control' =>
                    'private, no-store, no-cache, must-revalidate',

                'X-Content-Type-Options' =>
                    'nosniff',

                'X-HUMAS-XLSX-Validated' =>
                    '1',
            ]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | SIMPAN HASIL GENERATOR KE FILE SEMENTARA
    |--------------------------------------------------------------------------
    |
    | Hasil generator lama ditangkap dahulu.
    | Output tidak dikirim ke browser sebelum lolos validasi.
    |
    */

    private function saveOriginalStream(
        StreamedResponse $response,
        string $destination
    ): void {
        $file = @fopen($destination, 'wb');

        if ($file === false) {
            throw new RuntimeException(
                'Tidak dapat membuka file Excel sementara untuk ditulis.'
            );
        }

        $initialBufferLevel = ob_get_level();

        $writeError = false;
        $generationError = null;

        ob_start(
            static function (string $buffer) use (
                $file,
                &$writeError
            ): string {
                $length = strlen($buffer);
                $offset = 0;

                while ($offset < $length) {
                    $written = @fwrite(
                        $file,
                        substr($buffer, $offset)
                    );

                    if (
                        $written === false ||
                        $written === 0
                    ) {
                        $writeError = true;
                        break;
                    }

                    $offset += $written;
                }

                return '';
            },
            8192
        );

        try {
            $response->sendContent();
        } catch (Throwable $error) {
            $generationError = $error;
        } finally {
            /*
            | Lepaskan semua buffer yang mungkin
            | dibuka selama proses pembuatan Excel.
            */

            while (
                ob_get_level() >
                $initialBufferLevel
            ) {
                ob_end_flush();
            }

            fflush($file);
            fclose($file);
        }

        if ($generationError !== null) {
            throw $generationError;
        }

        if ($writeError) {
            throw new RuntimeException(
                'Penulisan file Excel sementara tidak selesai.'
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDASI FILE XLSX
    |--------------------------------------------------------------------------
    |
    | Pemeriksaan:
    |
    | 1. File benar-benar tersedia.
    | 2. Ukuran tidak kosong.
    | 3. Header merupakan ZIP.
    | 4. Struktur ZIP tidak rusak.
    | 5. Komponen Excel tersedia.
    | 6. Workbook dapat dibaca oleh PhpSpreadsheet.
    |
    */

    private function verifyXlsx(
        string $path
    ): void {
        clearstatcache(true, $path);

        /*
        |--------------------------------------------------------------------------
        | CEK FILE
        |--------------------------------------------------------------------------
        */

        if (
            !is_file($path) ||
            (filesize($path) ?: 0) < 200
        ) {
            throw new RuntimeException(
                'Hasil export kosong atau terlalu kecil.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | CEK HEADER ZIP
        |--------------------------------------------------------------------------
        */

        $handle = @fopen($path, 'rb');

        if ($handle === false) {
            throw new RuntimeException(
                'File export tidak dapat diperiksa.'
            );
        }

        try {
            $magic = fread($handle, 4);
        } finally {
            fclose($handle);
        }

        if ($magic !== "PK\x03\x04") {
            throw new RuntimeException(
                'Isi file bukan XLSX/ZIP. Ada kemungkinan output error PHP tercetak.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | CEK EKSTENSI ZIP
        |--------------------------------------------------------------------------
        */

        if (!class_exists(ZipArchive::class)) {
            throw new RuntimeException(
                'Ekstensi ZIP PHP belum tersedia.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | CEK INTEGRITAS ZIP
        |--------------------------------------------------------------------------
        */

        $zip = new ZipArchive();

        $result = $zip->open(
            $path,
            ZipArchive::CHECKCONS
        );

        if ($result !== true) {
            throw new RuntimeException(
                'File ZIP Excel tidak lengkap atau rusak. Kode: ' .
                $result
            );
        }

        /*
        |--------------------------------------------------------------------------
        | CEK STRUKTUR WORKBOOK
        |--------------------------------------------------------------------------
        */

        try {
            foreach (
                [
                    '[Content_Types].xml',
                    '_rels/.rels',
                    'xl/workbook.xml',
                    'xl/_rels/workbook.xml.rels',
                    'xl/worksheets/sheet1.xml',
                ] as $required
            ) {
                if (
                    $zip->locateName(
                        $required
                    ) === false
                ) {
                    throw new RuntimeException(
                        'Komponen Excel tidak ditemukan: ' .
                        $required
                    );
                }
            }
        } finally {
            $zip->close();
        }

        /*
        |--------------------------------------------------------------------------
        | UJI BACA ULANG DENGAN PHPSPREADSHEET
        |--------------------------------------------------------------------------
        |
        | ZIP yang valid belum tentu merupakan
        | workbook Excel yang dapat dibuka.
        |
        | Karena itu, workbook dibaca kembali
        | sebelum file dikirim ke user.
        |
        */

        $workbook = null;

        try {
            $reader = IOFactory::createReader('Xlsx');

            $reader->setReadDataOnly(true);

            $workbook = $reader->load($path);

            if (
                $workbook->getSheetCount() < 1
            ) {
                throw new RuntimeException(
                    'Workbook Excel tidak memiliki worksheet.'
                );
            }
        } catch (Throwable $error) {
            throw new RuntimeException(
                'Workbook tidak dapat dibaca kembali: ' .
                $error->getMessage(),
                0,
                $error
            );
        } finally {
            if ($workbook !== null) {
                $workbook->disconnectWorksheets();
            }

            unset(
                $workbook,
                $reader
            );
        }
    }
}
