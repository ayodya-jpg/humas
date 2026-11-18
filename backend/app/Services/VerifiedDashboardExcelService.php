<?php

namespace App\Services;

use Illuminate\Support\Collection;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;
use ZipArchive;

/**
 * Membuat XLSX lengkap pada file sementara, memvalidasinya,
 * kemudian mengirimnya dengan Content-Length yang tepat.
 *
 * Semua sheet dan formatting tetap menggunakan DashboardExcelService.
 */
class VerifiedDashboardExcelService extends DashboardExcelService
{
    public function download(
        Collection $requests,
        array $summary,
        array $filters,
        array $report = []
    ): BinaryFileResponse {
        $source = parent::download(
            $requests,
            $summary,
            $filters,
            $report
        );

        if (!$source instanceof StreamedResponse) {
            throw new RuntimeException(
                'Generator Excel tidak mengembalikan stream XLSX.'
            );
        }

        $temporaryPath = tempnam(
            sys_get_temp_dir(),
            'humas_excel_'
        );

        if ($temporaryPath === false) {
            throw new RuntimeException(
                'Tidak bisa membuat file sementara untuk export Excel.'
            );
        }

        try {
            $this->captureXlsx($source, $temporaryPath);
            $this->validateXlsx($temporaryPath);

            $start = preg_replace(
                '/[^0-9-]/',
                '',
                (string) (
                    $filters['start_date']
                    ?? now()->subDays(29)->toDateString()
                )
            );

            $end = preg_replace(
                '/[^0-9-]/',
                '',
                (string) (
                    $filters['end_date']
                    ?? now()->toDateString()
                )
            );

            $filename = sprintf(
                'Laporan_Dashboard_HUMAS_SEKPIM_%s_sd_%s.xlsx',
                $start,
                $end
            );

            // BinaryFileResponse mengirim berkas utuh, bukan stream
            // yang masih mengerjakan pembentukan XLSX saat download.
            return response()->download(
                $temporaryPath,
                $filename,
                [
                    'Content-Type' =>
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Cache-Control' =>
                        'private, no-store, no-cache, must-revalidate',
                    'Pragma' => 'no-cache',
                    'X-Content-Type-Options' => 'nosniff',
                    'X-Excel-Verified' => '1',
                ]
            )->deleteFileAfterSend(true);
        } catch (Throwable $error) {
            @unlink($temporaryPath);

            report($error);

            throw new RuntimeException(
                'Export Excel gagal divalidasi. '
                . 'File yang rusak tidak dikirim. '
                . $error->getMessage(),
                0,
                $error
            );
        }
    }

    /**
     * Menangkap output PhpSpreadsheet dari callback lama ke disk.
     * Tidak perlu memasukkan seluruh ZIP XLSX ke string di memori.
     */
    private function captureXlsx(
        StreamedResponse $response,
        string $path
    ): void {
        $file = @fopen($path, 'wb');

        if ($file === false) {
            throw new RuntimeException(
                'File sementara Excel tidak dapat ditulis.'
            );
        }

        $startingLevel = ob_get_level();
        $failedToWrite = false;
        $streamError = null;

        ob_start(
            static function (string $chunk) use (
                $file,
                &$failedToWrite
            ): string {
                $length = strlen($chunk);
                $offset = 0;

                while ($offset < $length) {
                    $written = @fwrite(
                        $file,
                        substr($chunk, $offset)
                    );

                    if ($written === false || $written === 0) {
                        $failedToWrite = true;
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
            $streamError = $error;
        } finally {
            while (ob_get_level() > $startingLevel) {
                ob_end_flush();
            }

            fclose($file);
        }

        if ($streamError !== null) {
            throw $streamError;
        }

        if ($failedToWrite) {
            throw new RuntimeException(
                'Penyimpanan sementara Excel tidak selesai.'
            );
        }
    }

    /**
     * Memeriksa XLSX sebagai ZIP dan memastikan komponen utama
     * workbook tersedia, termasuk minimal satu worksheet.
     */
    private function validateXlsx(string $path): void
    {
        clearstatcache(true, $path);

        if (
            !is_file($path)
            || (filesize($path) ?: 0) < 200
        ) {
            throw new RuntimeException(
                'Ukuran file Excel kosong atau tidak wajar.'
            );
        }

        $handle = @fopen($path, 'rb');

        if ($handle === false) {
            throw new RuntimeException(
                'File Excel sementara tidak bisa dibaca.'
            );
        }

        try {
            $magic = fread($handle, 4);
        } finally {
            fclose($handle);
        }

        if ($magic !== "PK\x03\x04") {
            throw new RuntimeException(
                'Header file bukan XLSX/ZIP. '
                . 'Periksa kemungkinan output PHP atau error yang tercetak.'
            );
        }

        if (!class_exists(ZipArchive::class)) {
            throw new RuntimeException(
                'Ekstensi PHP ZIP belum diaktifkan.'
            );
        }

        $zip = new ZipArchive();
        $status = $zip->open($path, ZipArchive::CHECKCONS);

        if ($status !== true) {
            throw new RuntimeException(
                'Arsip ZIP XLSX gagal diuji integritasnya. '
                . 'Kode error ZIP: ' . $status
            );
        }

        try {
            foreach ([
                '[Content_Types].xml',
                '_rels/.rels',
                'xl/workbook.xml',
                'xl/_rels/workbook.xml.rels',
            ] as $required) {
                if ($zip->locateName($required) === false) {
                    throw new RuntimeException(
                        'Komponen XLSX tidak ada: ' . $required
                    );
                }
            }

            $hasSheet = false;

            for ($i = 0; $i < $zip->numFiles; $i++) {
                $entry = $zip->getNameIndex($i);

                if (
                    is_string($entry)
                    && preg_match(
                        '~^xl/worksheets/sheet[0-9]+\.xml$~',
                        $entry
                    )
                ) {
                    $hasSheet = true;
                    break;
                }
            }

            if (!$hasSheet) {
                throw new RuntimeException(
                    'Tidak ditemukan worksheet Excel.'
                );
            }

            // Workbook XML kecil; validasi well-formed jika DOM aktif.
            if (class_exists(\DOMDocument::class)) {
                $workbookXml = $zip->getFromName(
                    'xl/workbook.xml'
                );

                if ($workbookXml === false) {
                    throw new RuntimeException(
                        'Workbook XML tidak dapat dibaca.'
                    );
                }

                $xml = new \DOMDocument();

                if (!@$xml->loadXML(
                    $workbookXml,
                    LIBXML_NONET
                )) {
                    throw new RuntimeException(
                        'Workbook XML tidak valid.'
                    );
                }
            }
        } finally {
            $zip->close();
        }
    }
}
