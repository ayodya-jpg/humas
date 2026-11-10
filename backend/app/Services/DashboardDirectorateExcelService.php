<?php

namespace App\Services;

use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardDirectorateExcelService extends DashboardExcelService
{
    public function __construct(
        private readonly DirectorateReportService $directorateReport
    ) {
    }

    private function addTable(
        $spreadsheet,
        string $title,
        array $headers,
        array $rows
    ): void {
        $sheet = new Worksheet($spreadsheet, $title);
        $spreadsheet->addSheet($sheet);

        foreach ($headers as $index => $header) {
            $sheet->setCellValueExplicit(
                [$index + 1, 1],
                (string) $header,
                DataType::TYPE_STRING
            );
        }

        foreach ($rows as $rowNumber => $row) {
            foreach (array_values($row) as $index => $value) {
                $cell = [$index + 1, $rowNumber + 2];

                if (is_int($value) || is_float($value)) {
                    $sheet->setCellValue($cell, $value);
                } else {
                    // Selalu tulis teks sebagai string untuk
                    // menghindari formula injection dari input user.
                    $sheet->setCellValueExplicit(
                        $cell,
                        (string) ($value ?? ''),
                        DataType::TYPE_STRING
                    );
                }
            }
        }

        $lastColumn = Coordinate::stringFromColumnIndex(
            count($headers)
        );

        $headerRange = "A1:{$lastColumn}1";

        $sheet->getStyle($headerRange)
            ->getFont()
            ->setBold(true)
            ->getColor()
            ->setARGB('FFFFFFFF');

        $sheet->getStyle($headerRange)
            ->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB('FFB91C1C');

        $sheet->getRowDimension(1)->setRowHeight(26);
        $sheet->freezePane('A2');

        for ($column = 1; $column <= count($headers); $column++) {
            $letter = Coordinate::stringFromColumnIndex($column);

            $sheet->getColumnDimension($letter)->setWidth(
                in_array($headers[$column - 1], [
                    'Agenda',
                    'Catatan',
                    'Keputusan',
                    'Tindak Lanjut',
                ], true) ? 42 : 23
            );
        }

        if (count($rows) > 0) {
            $sheet->setAutoFilter(
                "A1:{$lastColumn}" . (count($rows) + 1)
            );
        }
    }

    private function appendDirectorateSheets(
        $spreadsheet,
        array $data
    ): void {
        $current = $data['current'];
        $summary = $current['summary'];

        $this->addTable(
            $spreadsheet,
            'Rekap Direktorat',
            ['Indikator', 'Jumlah'],
            [
                ['Total Agenda', $summary['total_agendas']],
                ['Agenda Rapat', $summary['planned_meetings']],
                ['Total Pengajuan Jadwal', $summary['total_schedule_requests']],
                ['Pengajuan Menunggu', $summary['pending_schedule_requests']],
                ['Pengajuan Disetujui', $summary['approved_schedule_requests']],
                ['Pengajuan Ditolak', $summary['rejected_schedule_requests']],
                [
                    'Rapat Terlaksana',
                    $summary['has_meeting_records'] &&
                    $summary['can_view_meeting_notes']
                        ? $summary['meetings_held']
                        : 'Data realisasi belum tersedia',
                ],
            ]
        );

        $this->addTable(
            $spreadsheet,
            'Agenda Direktorat',
            [
                'ID',
                'Tanggal',
                'Direktorat',
                'Agenda',
                'Kategori',
                'Jam Mulai',
                'Jam Selesai',
                'Lokasi',
            ],
            array_map(
                fn ($item): array => [
                    $item['id'],
                    $item['event_date'],
                    $item['directorate_label'],
                    $item['title'],
                    $item['agenda_type'],
                    $item['start_time'],
                    $item['end_time'],
                    $item['location'],
                ],
                $current['agendas']
            )
        );

        if ($summary['can_view_schedule_requests']) {
            $this->addTable(
                $spreadsheet,
                'Pengajuan Jadwal',
                [
                    'ID',
                    'Diajukan',
                    'Tanggal Agenda',
                    'Direktorat',
                    'Agenda',
                    'Unit Pemohon',
                    'PIC',
                    'Status',
                    'ID Agenda Disetujui',
                ],
                array_map(
                    fn ($item): array => [
                        $item['id'],
                        $item['created_at'],
                        $item['event_date'],
                        $item['directorate_label'],
                        $item['title'],
                        $item['requester_unit'],
                        $item['pic_name'],
                        $item['status'],
                        $item['approved_schedule_id'],
                    ],
                    $current['schedule_requests']
                )
            );
        }

        $this->addTable(
            $spreadsheet,
            'YoY Direktorat',
            [
                'Direktorat',
                'Tahun Sebelumnya',
                'Tahun Berjalan',
                'Selisih',
                'Pertumbuhan (%)',
            ],
            array_map(
                fn ($item): array => [
                    $item['label'],
                    $item['previous'],
                    $item['current'],
                    $item['difference'],
                    $item['growth_percent'] === null
                        ? 'N/A'
                        : $item['growth_percent'],
                ],
                $data['comparison']
            )
        );

        if (
            $summary['has_meeting_records'] &&
            $summary['can_view_meeting_notes']
        ) {
            $this->addTable(
                $spreadsheet,
                'Realisasi Rapat',
                [
                    'Tanggal',
                    'Direktorat',
                    'Agenda',
                    'Status Realisasi',
                    'Peserta',
                    'Catatan',
                    'Keputusan',
                    'Tindak Lanjut',
                    'PIC',
                    'Tenggat',
                ],
                array_map(
                    fn ($item): array => [
                        $item['meeting_date'],
                        $item['directorate'],
                        $item['title'],
                        $item['realization_status'],
                        $item['participants_count'],
                        $item['notes'],
                        $item['decisions'],
                        $item['follow_up'],
                        $item['follow_up_pic'],
                        $item['follow_up_due_date'],
                    ],
                    $current['meeting_records']
                )
            );
        }
    }

    public function download(
        Collection $requests,
        array $summary,
        array $filters
    ): StreamedResponse {
        // Ketika admin memfilter layanan tertentu,
        // export tetap menggunakan laporan existing.
        if (($filters['service'] ?? 'all') !== 'all') {
            return parent::download(
                $requests,
                $summary,
                $filters
            );
        }

        $user = request()->user();

        if (
            !$user ||
            !in_array($user->role, [
                'admin',
                'admin_humas',
                'admin_sekpim',
                'superadmin',
            ], true)
        ) {
            return parent::download(
                $requests,
                $summary,
                $filters
            );
        }

        $report = $this->directorateReport->generate(
            $filters['start_date'],
            $filters['end_date'],
            $user->role
        );

        /*
         * Gunakan pembuat Excel lama, bukan mengganti
         * format dan formula workbook existing.
         */
        $originalResponse = parent::download(
            $requests,
            $summary,
            $filters
        );

        $sourceFile = tempnam(sys_get_temp_dir(), 'humas_src_');
        $outputFile = tempnam(sys_get_temp_dir(), 'humas_out_');

        if ($sourceFile === false || $outputFile === false) {
            throw new \RuntimeException(
                'Tidak dapat membuat file sementara untuk export Excel.'
            );
        }

        try {
            /*
             * Simpan output XLSX existing ke file sementara.
             * Ini dilakukan sebelum header download dikirim.
             */
            $handle = fopen($sourceFile, 'wb');

            if ($handle === false) {
                throw new \RuntimeException(
                    'Gagal membuka file sementara Excel.'
                );
            }

            $bufferLevel = ob_get_level();

            ob_start(
                static function (string $chunk) use ($handle): string {
                    fwrite($handle, $chunk);
                    return '';
                },
                8192
            );

            try {
                $callback = $originalResponse->getCallback();
                $callback();
            } finally {
                while (ob_get_level() > $bufferLevel) {
                    ob_end_flush();
                }

                fclose($handle);
            }

            $signature = file_get_contents(
                $sourceFile,
                false,
                null,
                0,
                4
            );

            if ($signature !== "PK\x03\x04") {
                throw new \RuntimeException(
                    'File Excel existing tidak valid. Periksa output PHP sebelum tag pembuka <?php.'
                );
            }

            $spreadsheet = IOFactory::load($sourceFile);

            $this->appendDirectorateSheets(
                $spreadsheet,
                $report
            );

            $spreadsheet->setActiveSheetIndex(0);

            $writer = new Xlsx($spreadsheet);
            $writer->save($outputFile);

            $spreadsheet->disconnectWorksheets();

            if (
                !is_file($outputFile) ||
                filesize($outputFile) < 100
            ) {
                throw new \RuntimeException(
                    'File Excel hasil penggabungan tidak valid.'
                );
            }

            // Validasi ZIP: XLSX adalah format berbasis ZIP.
            $zip = new \ZipArchive();

            if ($zip->open($outputFile) !== true) {
                throw new \RuntimeException(
                    'Struktur ZIP workbook tidak valid.'
                );
            }

            $valid = $zip->locateName('[Content_Types].xml') !== false;
            $zip->close();

            if (!$valid) {
                throw new \RuntimeException(
                    'Struktur internal workbook tidak lengkap.'
                );
            }
        } catch (\Throwable $error) {
            if (is_file($outputFile)) {
                @unlink($outputFile);
            }

            throw $error;
        } finally {
            if (is_file($sourceFile)) {
                @unlink($sourceFile);
            }
        }

        $filename = sprintf(
            'Laporan_Dashboard_HUMAS_SEKPIM_%s_sd_%s.xlsx',
            $filters['start_date'],
            $filters['end_date']
        );

        return response()->streamDownload(
            static function () use ($outputFile): void {
                try {
                    readfile($outputFile);
                } finally {
                    @unlink($outputFile);
                }
            },
            $filename,
            [
                'Content-Type' =>
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control' =>
                    'no-store, no-cache, must-revalidate',
            ]
        );
    }
}
