<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardExcelService
{
    /*
    |--------------------------------------------------------------------------
    | WARNA EXPORT LAMA
    |--------------------------------------------------------------------------
    */

    private const COLOR_TITLE = 'FF991B1B';

    private const COLOR_HEADER = 'FFB91C1C';

    private const COLOR_SECTION = 'FFFEE2E2';

    private const COLOR_SECTION_TEXT = 'FF7F1D1D';

    private const COLOR_ROW_ALT = 'FFF8FAFC';

    private const COLOR_BORDER = 'FFE2E8F0';

    private const COLOR_LINK = 'FF2563EB';

    private const COLOR_WHITE = 'FFFFFFFF';

    private const COLOR_BLACK = 'FF000000';

    public function download(
        Collection $requests,
        array $summary,
        array $filters
    ): StreamedResponse {
        $spreadsheet =
            new Spreadsheet();

        /*
        |--------------------------------------------------------------------------
        | Ringkasan
        |--------------------------------------------------------------------------
        */

        $summarySheet =
            $spreadsheet
                ->getActiveSheet();

        $summarySheet
            ->setTitle(
                'Ringkasan'
            );

        $this->buildSummarySheet(
            $summarySheet,
            $summary,
            $filters,
            $requests
        );

        /*
        |--------------------------------------------------------------------------
        | Semua Layanan
        |--------------------------------------------------------------------------
        */

        $allSheet =
            $spreadsheet
                ->createSheet();

        $allSheet
            ->setTitle(
                'Semua Layanan'
            );

        $this->buildAllServicesSheet(
            $allSheet,
            $requests
        );

        /*
        |--------------------------------------------------------------------------
        | Merchandise
        |--------------------------------------------------------------------------
        */

        $merchandiseSheet =
            $spreadsheet
                ->createSheet();

        $merchandiseSheet
            ->setTitle(
                'Merchandise'
            );

        $this->buildMerchandiseSheet(
            $merchandiseSheet,
            $requests
                ->where(
                    'service',
                    'merchandise'
                )
                ->values()
        );

        /*
        |--------------------------------------------------------------------------
        | Liputan Humas
        |--------------------------------------------------------------------------
        */

        $humasSheet =
            $spreadsheet
                ->createSheet();

        $humasSheet
            ->setTitle(
                'Liputan Humas'
            );

        $this->buildHumasSheet(
            $humasSheet,
            $requests
                ->where(
                    'service',
                    'humas'
                )
                ->values()
        );

        /*
        |--------------------------------------------------------------------------
        | Peminjaman SEKPiM
        |--------------------------------------------------------------------------
        */

        $borrowingSheet =
            $spreadsheet
                ->createSheet();

        $borrowingSheet
            ->setTitle(
                'Peminjaman SEKPiM'
            );

        $this->buildBorrowingSheet(
            $borrowingSheet,
            $requests
                ->where(
                    'service',
                    'borrowing'
                )
                ->values()
        );

        $spreadsheet
            ->setActiveSheetIndex(
                0
            );

        $startDate =
            $filters['start_date']
                ?? now()
                    ->subDays(29)
                    ->toDateString();

        $endDate =
            $filters['end_date']
                ?? now()
                    ->toDateString();

        $filename =
            sprintf(
                'Laporan_Dashboard_HUMAS_SEKPIM_%s_sd_%s.xlsx',
                $startDate,
                $endDate
            );

        return response()
            ->streamDownload(
                function () use (
                    $spreadsheet
                ): void {
                    $writer =
                        new Xlsx(
                            $spreadsheet
                        );

                    $writer->save(
                        'php://output'
                    );

                    $spreadsheet
                        ->disconnectWorksheets();
                },
                $filename,
                [
                    'Content-Type' =>
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

                    'Cache-Control' =>
                        'max-age=0, no-cache, no-store, must-revalidate',

                    'Pragma' =>
                        'public',
                ]
            );
    }

    /*
    |--------------------------------------------------------------------------
    | RINGKASAN
    |--------------------------------------------------------------------------
    */

    private function buildSummarySheet(
        Worksheet $sheet,
        array $summary,
        array $filters,
        Collection $requests
    ): void {
        /*
        |--------------------------------------------------------------------------
        | Judul
        |--------------------------------------------------------------------------
        */

        $sheet->mergeCells(
            'A1:D1'
        );

        $sheet->setCellValue(
            'A1',
            'LAPORAN DASHBOARD HUMAS & SEKPiM'
        );

        $sheet
            ->getStyle(
                'A1:D1'
            )
            ->getFill()
            ->setFillType(
                Fill::FILL_SOLID
            )
            ->getStartColor()
            ->setARGB(
                self::COLOR_TITLE
            );

        $sheet
            ->getStyle(
                'A1:D1'
            )
            ->getFont()
            ->setBold(
                true
            )
            ->setSize(
                16
            )
            ->getColor()
            ->setARGB(
                self::COLOR_WHITE
            );

        $sheet
            ->getStyle(
                'A1:D1'
            )
            ->getAlignment()
            ->setHorizontal(
                Alignment::HORIZONTAL_CENTER
            )
            ->setVertical(
                Alignment::VERTICAL_CENTER
            )
            ->setWrapText(
                true
            );

        $sheet
            ->getRowDimension(
                1
            )
            ->setRowHeight(
                30
            );

        /*
        |--------------------------------------------------------------------------
        | Informasi Filter
        |--------------------------------------------------------------------------
        */

        $sheet->setCellValue(
            'A2',
            'Periode'
        );

        $sheet->setCellValue(
            'B2',
            $this->formatPeriod(
                $filters[
                    'start_date'
                ] ?? null,
                $filters[
                    'end_date'
                ] ?? null
            )
        );

        $sheet->setCellValue(
            'A3',
            'Layanan'
        );

        $sheet->setCellValue(
            'B3',
            $this->serviceLabel(
                $filters[
                    'service'
                ] ?? 'all'
            )
        );

        $sheet->setCellValue(
            'A4',
            'Status'
        );

        $sheet->setCellValue(
            'B4',
            $this->statusLabel(
                $filters[
                    'status'
                ] ?? 'all'
            )
        );

        $sheet->setCellValue(
            'A5',
            'Waktu Export'
        );

        $sheet->setCellValue(
            'B5',
            now()->format(
                'd-m-Y H:i:s'
            )
        );

        $sheet
            ->getStyle(
                'A2:A5'
            )
            ->getFont()
            ->setBold(
                true
            );

        /*
        |--------------------------------------------------------------------------
        | Ringkasan Status
        |--------------------------------------------------------------------------
        */

        $this->setSectionHeader(
            $sheet,
            7,
            'Ringkasan Status',
            'D'
        );

        $summaryRows = [
            [
                'Total Pengajuan',
                $summary[
                    'total'
                ] ?? 0,
            ],

            [
                'Menunggu',
                $summary[
                    'pending'
                ] ?? 0,
            ],

            [
                'Perlu Revisi',
                $summary[
                    'revision'
                ] ?? 0,
            ],

            [
                'Disetujui',
                $summary[
                    'approved'
                ] ?? 0,
            ],

            [
                'Ditolak',
                $summary[
                    'rejected'
                ] ?? 0,
            ],

            [
                'Sedang Dipinjam',
                $summary[
                    'borrowed'
                ] ?? 0,
            ],

            [
                'Dikembalikan',
                $summary[
                    'returned'
                ] ?? 0,
            ],

            [
                'Selesai',
                $summary[
                    'completed'
                ] ?? 0,
            ],

            [
                'Selesai / Dikembalikan',
                $summary[
                    'finished'
                ] ?? 0,
            ],

            [
                'Total Kejadian Revisi Merchandise',
                $summary[
                    'total_revision_events'
                ] ?? 0,
            ],
        ];

        $row =
            8;

        foreach (
            $summaryRows as
            $summaryRow
        ) {
            $sheet->setCellValue(
                "A{$row}",
                $summaryRow[0]
            );

            $sheet->setCellValue(
                "B{$row}",
                $summaryRow[1]
            );

            $row++;
        }

        /*
        |--------------------------------------------------------------------------
        | Analisis Tambahan
        |--------------------------------------------------------------------------
        */

        $this->setSectionHeader(
            $sheet,
            19,
            'Analisis Tambahan',
            'D'
        );

        $total =
            (int) (
                $summary[
                    'total'
                ] ?? 0
            );

        $rejected =
            (int) (
                $summary[
                    'rejected'
                ] ?? 0
            );

        $revision =
            (int) (
                $summary[
                    'revision'
                ] ?? 0
            );

        $rejectionPercentage =
            $total > 0
                ? (
                    $rejected /
                    $total
                ) * 100
                : 0;

        $revisionPercentage =
            $total > 0
                ? (
                    $revision /
                    $total
                ) * 100
                : 0;

        $withUserEvidence =
            $requests
                ->filter(
                    fn (
                        array $item
                    ): bool =>
                        !empty(
                            $item[
                                'user_evidence_url'
                            ]
                        ) ||
                        !empty(
                            $item[
                                'user_reference_link'
                            ]
                        )
                )
                ->count();

        $withAdminEvidence =
            $requests
                ->filter(
                    fn (
                        array $item
                    ): bool =>
                        !empty(
                            $item[
                                'admin_evidence_url'
                            ]
                        ) ||
                        !empty(
                            $item[
                                'admin_result_link'
                            ]
                        ) ||
                        !empty(
                            $item[
                                'handover_evidence_url'
                            ]
                        ) ||
                        !empty(
                            $item[
                                'return_evidence_url'
                            ]
                        )
                )
                ->count();

        $sheet->setCellValue(
            'A20',
            'Persentase Penolakan'
        );

        $sheet->setCellValue(
            'B20',
            number_format(
                $rejectionPercentage,
                2,
                ',',
                '.'
            ) . '%'
        );

        $sheet->setCellValue(
            'A21',
            'Persentase Revisi Aktif'
        );

        $sheet->setCellValue(
            'B21',
            number_format(
                $revisionPercentage,
                2,
                ',',
                '.'
            ) . '%'
        );

        $sheet->setCellValue(
            'A22',
            'Pengajuan dengan Bukti User'
        );

        $sheet->setCellValue(
            'B22',
            $withUserEvidence
        );

        $sheet->setCellValue(
            'A23',
            'Pengajuan dengan Bukti/Hasil Admin'
        );

        $sheet->setCellValue(
            'B23',
            $withAdminEvidence
        );

        /*
        |--------------------------------------------------------------------------
        | Distribusi Layanan
        |--------------------------------------------------------------------------
        */

        $this->setSectionHeader(
            $sheet,
            25,
            'Distribusi Layanan',
            'D'
        );

        $sheet->setCellValue(
            'A26',
            'Jenis Layanan'
        );

        $sheet->setCellValue(
            'B26',
            'Jumlah'
        );

        $this->styleHeader(
            $sheet,
            'A26:B26'
        );

        $serviceRows = [
            [
                'Merchandise',
                $requests
                    ->where(
                        'service',
                        'merchandise'
                    )
                    ->count(),
            ],

            [
                'Liputan Humas',
                $requests
                    ->where(
                        'service',
                        'humas'
                    )
                    ->count(),
            ],

            [
                'Peminjaman SEKPiM',
                $requests
                    ->where(
                        'service',
                        'borrowing'
                    )
                    ->count(),
            ],
        ];

        $serviceRow =
            27;

        foreach (
            $serviceRows as
            $serviceData
        ) {
            $sheet->setCellValue(
                "A{$serviceRow}",
                $serviceData[0]
            );

            $sheet->setCellValue(
                "B{$serviceRow}",
                $serviceData[1]
            );

            $serviceRow++;
        }

        /*
        |--------------------------------------------------------------------------
        | Ukuran Kolom Lama
        |--------------------------------------------------------------------------
        */

        $sheet
            ->getColumnDimension(
                'A'
            )
            ->setWidth(
                42
            );

        $sheet
            ->getColumnDimension(
                'B'
            )
            ->setWidth(
                34
            );

        $sheet
            ->getColumnDimension(
                'C'
            )
            ->setWidth(
                18
            );

        $sheet
            ->getColumnDimension(
                'D'
            )
            ->setWidth(
                18
            );

        $sheet
            ->getStyle(
                'A1:D29'
            )
            ->getAlignment()
            ->setVertical(
                Alignment::VERTICAL_CENTER
            )
            ->setWrapText(
                true
            );
    }

    /*
    |--------------------------------------------------------------------------
    | SEMUA LAYANAN
    |--------------------------------------------------------------------------
    */

    private function buildAllServicesSheet(
        Worksheet $sheet,
        Collection $requests
    ): void {
        /*
         * Struktur utama mengikuti export lama.
         * Detail terbaru dipertahankan.
         */

        $headers = [
            'No',
            'Kode Pengajuan',
            'Jenis Layanan',
            'Nama Pemohon',
            'Email Pemohon',
            'Unit / Instansi',
            'Judul / Kegiatan',
            'Tanggal Pengajuan',
            'Status',

            'Jumlah Revisi',
            'Revisi Terakhir',
            'Alasan Revisi Terakhir',
            'Riwayat Semua Revisi',

            'Tanggal Disetujui',
            'Tanggal Ditolak',
            'Tanggal Selesai',

            'Alasan Penolakan',
            'Catatan Admin',
            'Catatan Hasil Admin',

            'Bukti User',
            'Link Referensi User',

            'Bukti Admin',
            'Link Hasil Admin',

            'Bukti Serah Terima',
            'Bukti Pengembalian',

            'Detail Pengajuan',
        ];

        $this->writeHeaders(
            $sheet,
            $headers
        );

        $row =
            2;

        foreach (
            $requests->values()
            as $index =>
            $item
        ) {
            $sheet->setCellValue(
                "A{$row}",
                $index + 1
            );

            $sheet->setCellValue(
                "B{$row}",
                $item[
                    'code'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "C{$row}",
                $item[
                    'service_label'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "D{$row}",
                $item[
                    'requester'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "E{$row}",
                $item[
                    'requester_email'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "F{$row}",
                $item[
                    'unit'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "G{$row}",
                $item[
                    'title'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "H{$row}",
                $this->formatDateTime(
                    $item[
                        'submitted_at'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "I{$row}",
                $this->statusLabel(
                    $item[
                        'status'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "J{$row}",
                $item[
                    'revision_count'
                ] ?? 0
            );

            $sheet->setCellValue(
                "K{$row}",
                $this->formatDateTime(
                    $item[
                        'latest_revision_at'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "L{$row}",
                $item[
                    'latest_revision_reason'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "M{$row}",
                $item[
                    'revision_history_text'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "N{$row}",
                $this->formatDateTime(
                    $item[
                        'approved_at'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "O{$row}",
                $this->formatDateTime(
                    $item[
                        'rejected_at'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "P{$row}",
                $this->formatDateTime(
                    $item[
                        'completed_at'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "Q{$row}",
                $item[
                    'rejection_reason'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "R{$row}",
                $item[
                    'admin_note'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "S{$row}",
                $item[
                    'admin_result_note'
                ] ?? '-'
            );

            $this->setHyperlinkCell(
                $sheet,
                "T{$row}",
                $item[
                    'user_evidence_url'
                ] ?? null,
                'Buka Bukti User'
            );

            $this->setHyperlinkCell(
                $sheet,
                "U{$row}",
                $item[
                    'user_reference_link'
                ] ?? null,
                'Buka Referensi'
            );

            $this->setHyperlinkCell(
                $sheet,
                "V{$row}",
                $item[
                    'admin_evidence_url'
                ] ?? null,
                'Buka Bukti Admin'
            );

            $this->setHyperlinkCell(
                $sheet,
                "W{$row}",
                $item[
                    'admin_result_link'
                ] ?? null,
                'Buka Hasil Admin'
            );

            $this->setHyperlinkCell(
                $sheet,
                "X{$row}",
                $item[
                    'handover_evidence_url'
                ] ?? null,
                'Buka Serah Terima'
            );

            $this->setHyperlinkCell(
                $sheet,
                "Y{$row}",
                $item[
                    'return_evidence_url'
                ] ?? null,
                'Buka Pengembalian'
            );

            $this->setHyperlinkCell(
                $sheet,
                "Z{$row}",
                $item[
                    'detail_url'
                ] ?? null,
                'Buka Detail'
            );

            $this->styleBodyRow(
                $sheet,
                $row,
                count(
                    $headers
                )
            );

            $row++;
        }

        $this->finishOldStyleTable(
            $sheet,
            $headers,
            $row - 1
        );

        $this->applyAllServicesWidths(
            $sheet
        );
    }

    /*
    |--------------------------------------------------------------------------
    | MERCHANDISE
    |--------------------------------------------------------------------------
    */

    private function buildMerchandiseSheet(
        Worksheet $sheet,
        Collection $requests
    ): void {
        $headers = [
            'No',
            'Kode Pengajuan',
            'Nama Pemohon',
            'Email Pemohon',

            'Nama Kegiatan',
            'Tanggal Kegiatan',

            'Instansi Tamu',
            'Nama Tamu',
            'Jabatan Tamu',

            'Daftar Merchandise',
            'Total Kuantitas',

            'Tanggal Pengajuan',
            'Status',

            'Jumlah Revisi',
            'Tanggal Revisi Terakhir',
            'Tanggal Submit Ulang Terakhir',
            'Alasan Revisi Terakhir',
            'Riwayat Semua Revisi',

            'Tanggal Disetujui',
            'Tanggal Ditolak',
            'Tanggal Selesai',

            'Alasan Penolakan',
            'Catatan Pemohon',
            'Catatan Admin',

            'Bukti File User',
            'Link Bukti User',

            'Bukti Admin',

            'Detail Pengajuan',
        ];

        $this->writeHeaders(
            $sheet,
            $headers
        );

        $row =
            2;

        foreach (
            $requests->values()
            as $index =>
            $item
        ) {
            $values = [
                $index + 1,

                $item[
                    'code'
                ] ?? '-',

                $item[
                    'requester'
                ] ?? '-',

                $item[
                    'requester_email'
                ] ?? '-',

                $item[
                    'title'
                ] ?? '-',

                $this->formatDate(
                    $item[
                        'activity_date'
                    ] ?? null
                ),

                $item[
                    'institution_name'
                ] ?? '-',

                $item[
                    'guest_name'
                ] ?? '-',

                $item[
                    'guest_position'
                ] ?? '-',

                $item[
                    'items_text'
                ] ?? '-',

                $item[
                    'total_quantity'
                ] ?? 0,

                $this->formatDateTime(
                    $item[
                        'submitted_at'
                    ] ?? null
                ),

                $this->statusLabel(
                    $item[
                        'status'
                    ] ?? null
                ),

                $item[
                    'revision_count'
                ] ?? 0,

                $this->formatDateTime(
                    $item[
                        'latest_revision_at'
                    ] ?? null
                ),

                $this->formatDateTime(
                    $item[
                        'latest_resubmitted_at'
                    ] ?? null
                ),

                $item[
                    'latest_revision_reason'
                ] ?? '-',

                $item[
                    'revision_history_text'
                ] ?? '-',

                $this->formatDateTime(
                    $item[
                        'approved_at'
                    ] ?? null
                ),

                $this->formatDateTime(
                    $item[
                        'rejected_at'
                    ] ?? null
                ),

                $this->formatDateTime(
                    $item[
                        'completed_at'
                    ] ?? null
                ),

                $item[
                    'rejection_reason'
                ] ?? '-',

                $item[
                    'user_note'
                ] ?? '-',

                $item[
                    'admin_note'
                ] ?? '-',
            ];

            foreach (
                $values as
                $columnIndex =>
                $value
            ) {
                $column =
                    Coordinate::stringFromColumnIndex(
                        $columnIndex +
                        1
                    );

                $sheet->setCellValue(
                    "{$column}{$row}",
                    $value
                );
            }

            $this->setHyperlinkCell(
                $sheet,
                "Y{$row}",
                $item[
                    'user_evidence_url'
                ] ?? null,
                'Buka File User'
            );

            $this->setHyperlinkCell(
                $sheet,
                "Z{$row}",
                $item[
                    'user_reference_link'
                ] ?? null,
                'Buka Link User'
            );

            $this->setHyperlinkCell(
                $sheet,
                "AA{$row}",
                $item[
                    'admin_evidence_url'
                ] ?? null,
                'Buka Bukti Admin'
            );

            $this->setHyperlinkCell(
                $sheet,
                "AB{$row}",
                $item[
                    'detail_url'
                ] ?? null,
                'Buka Detail'
            );

            $this->styleBodyRow(
                $sheet,
                $row,
                count(
                    $headers
                )
            );

            $row++;
        }

        $this->finishOldStyleTable(
            $sheet,
            $headers,
            $row - 1
        );

        $this->applyMerchandiseWidths(
            $sheet
        );
    }

    /*
    |--------------------------------------------------------------------------
    | LIPUTAN HUMAS
    |--------------------------------------------------------------------------
    */

    private function buildHumasSheet(
        Worksheet $sheet,
        Collection $requests
    ): void {
        /*
         * Struktur utama sengaja dipertahankan
         * sama dengan export lama.
         */

        $headers = [
            'No',
            'Kode Request',

            'Nama Pemohon',
            'Email Pemohon',

            'Nama Unit / Prodi',
            'Kontak WhatsApp PIC',

            'Detail Kegiatan',
            'Jenis Liputan',
            'Lokasi Acara',

            'Pelaksanaan Kegiatan',
            'Waktu Pengajuan',

            'Status',

            'Tanggal Disetujui',
            'Tanggal Ditolak',
            'Tanggal Selesai',

            'Alasan Penolakan',
            'Catatan Admin',

            'Draft Artikel User',
            'Link Referensi User',

            'Bukti / File Admin',
            'Link Hasil Humas',
            'Catatan Hasil Humas',

            'Detail Pengajuan',
        ];

        $this->writeHeaders(
            $sheet,
            $headers
        );

        $row =
            2;

        foreach (
            $requests->values()
            as $index =>
            $item
        ) {
            $values = [
                $index + 1,

                $item[
                    'code'
                ] ?? '-',

                $item[
                    'requester'
                ] ?? '-',

                $item[
                    'requester_email'
                ] ?? '-',

                $item[
                    'unit'
                ] ?? '-',

                $item[
                    'pic_whatsapp'
                ] ?? '-',

                $item[
                    'activity_detail'
                ] ?? '-',

                $item[
                    'coverage_label'
                ] ??
                $item[
                    'title'
                ] ??
                '-',

                $item[
                    'event_location'
                ] ?? '-',

                $this->formatDate(
                    $item[
                        'event_date'
                    ] ?? null
                ),

                $this->formatDateTime(
                    $item[
                        'submitted_at'
                    ] ?? null
                ),

                $this->statusLabel(
                    $item[
                        'status'
                    ] ?? null
                ),

                $this->formatDateTime(
                    $item[
                        'approved_at'
                    ] ?? null
                ),

                $this->formatDateTime(
                    $item[
                        'rejected_at'
                    ] ?? null
                ),

                $this->formatDateTime(
                    $item[
                        'completed_at'
                    ] ?? null
                ),

                $item[
                    'rejection_reason'
                ] ?? '-',

                $item[
                    'admin_note'
                ] ?? '-',
            ];

            foreach (
                $values as
                $columnIndex =>
                $value
            ) {
                $column =
                    Coordinate::stringFromColumnIndex(
                        $columnIndex +
                        1
                    );

                $sheet->setCellValue(
                    "{$column}{$row}",
                    $value
                );
            }

            $this->setHyperlinkCell(
                $sheet,
                "R{$row}",
                $item[
                    'user_evidence_url'
                ] ?? null,
                'Buka Draft Artikel'
            );

            $this->setHyperlinkCell(
                $sheet,
                "S{$row}",
                $item[
                    'user_reference_link'
                ] ?? null,
                'Buka Referensi'
            );

            $this->setHyperlinkCell(
                $sheet,
                "T{$row}",
                $item[
                    'admin_evidence_url'
                ] ?? null,
                'Buka File Admin'
            );

            $this->setHyperlinkCell(
                $sheet,
                "U{$row}",
                $item[
                    'admin_result_link'
                ] ?? null,
                'Buka Hasil Humas'
            );

            $sheet->setCellValue(
                "V{$row}",
                $item[
                    'admin_result_note'
                ] ?? '-'
            );

            $this->setHyperlinkCell(
                $sheet,
                "W{$row}",
                $item[
                    'detail_url'
                ] ?? null,
                'Buka Detail'
            );

            $this->styleBodyRow(
                $sheet,
                $row,
                count(
                    $headers
                )
            );

            $row++;
        }

        $this->finishOldStyleTable(
            $sheet,
            $headers,
            $row - 1
        );

        $this->applyHumasWidths(
            $sheet
        );
    }

    /*
    |--------------------------------------------------------------------------
    | PEMINJAMAN SEKPiM
    |--------------------------------------------------------------------------
    */

    private function buildBorrowingSheet(
        Worksheet $sheet,
        Collection $requests
    ): void {
        /*
         * Tampilan mengikuti export lama.
         *
         * Evidence terbaru tetap ditambahkan
         * pada posisi yang sudah sesuai.
         */

        $headers = [
            'No',
            'Kode Peminjaman',

            'Nama Pemohon',
            'Email Pemohon',

            'Keperluan',

            'Tanggal Pinjam',
            'Tanggal Kembali',

            'Daftar Barang',
            'Total Kuantitas',

            'Tanggal Pengajuan',
            'Status',

            'Tanggal Disetujui',
            'Tanggal Ditolak',

            'Tanggal Dipinjam',
            'Tanggal Dikembalikan',

            'Alasan Penolakan',
            'Catatan Admin',

            'Bukti User',
            'Link Referensi User',

            'Bukti Serah Terima Admin',
            'Bukti Pengembalian Admin',

            'Detail Pengajuan',
        ];

        $this->writeHeaders(
            $sheet,
            $headers
        );

        $row =
            2;

        foreach (
            $requests->values()
            as $index =>
            $item
        ) {
            $values = [
                $index + 1,

                $item[
                    'code'
                ] ?? '-',

                $item[
                    'requester'
                ] ?? '-',

                $item[
                    'requester_email'
                ] ?? '-',

                $item[
                    'title'
                ] ?? '-',

                $this->formatDate(
                    $item[
                        'borrow_date'
                    ] ?? null
                ),

                $this->formatDate(
                    $item[
                        'return_date'
                    ] ?? null
                ),

                $item[
                    'items_text'
                ] ?? '-',

                $item[
                    'total_quantity'
                ] ?? 0,

                $this->formatDateTime(
                    $item[
                        'submitted_at'
                    ] ?? null
                ),

                $this->statusLabel(
                    $item[
                        'status'
                    ] ?? null
                ),

                $this->formatDateTime(
                    $item[
                        'approved_at'
                    ] ?? null
                ),

                $this->formatDateTime(
                    $item[
                        'rejected_at'
                    ] ?? null
                ),

                $this->formatDateTime(
                    $item[
                        'borrowed_at'
                    ] ?? null
                ),

                $this->formatDateTime(
                    $item[
                        'returned_at'
                    ] ?? null
                ),

                $item[
                    'rejection_reason'
                ] ?? '-',

                $item[
                    'admin_note'
                ] ?? '-',
            ];

            foreach (
                $values as
                $columnIndex =>
                $value
            ) {
                $column =
                    Coordinate::stringFromColumnIndex(
                        $columnIndex +
                        1
                    );

                $sheet->setCellValue(
                    "{$column}{$row}",
                    $value
                );
            }

            $this->setHyperlinkCell(
                $sheet,
                "R{$row}",
                $item[
                    'user_evidence_url'
                ] ?? null,
                'Buka Bukti User'
            );

            $this->setHyperlinkCell(
                $sheet,
                "S{$row}",
                $item[
                    'user_reference_link'
                ] ?? null,
                'Buka Referensi'
            );

            $this->setHyperlinkCell(
                $sheet,
                "T{$row}",
                $item[
                    'handover_evidence_url'
                ] ?? null,
                'Buka Serah Terima'
            );

            $this->setHyperlinkCell(
                $sheet,
                "U{$row}",
                $item[
                    'return_evidence_url'
                ] ?? null,
                'Buka Pengembalian'
            );

            $this->setHyperlinkCell(
                $sheet,
                "V{$row}",
                $item[
                    'detail_url'
                ] ?? null,
                'Buka Detail'
            );

            $this->styleBodyRow(
                $sheet,
                $row,
                count(
                    $headers
                )
            );

            $row++;
        }

        $this->finishOldStyleTable(
            $sheet,
            $headers,
            $row - 1
        );

        $this->applyBorrowingWidths(
            $sheet
        );
    }

    /*
    |--------------------------------------------------------------------------
    | STYLE HEADER TABLE
    |--------------------------------------------------------------------------
    */

    private function writeHeaders(
        Worksheet $sheet,
        array $headers
    ): void {
        foreach (
            $headers as
            $index =>
            $header
        ) {
            $column =
                Coordinate::stringFromColumnIndex(
                    $index + 1
                );

            $sheet->setCellValue(
                "{$column}1",
                $header
            );
        }

        $lastColumn =
            Coordinate::stringFromColumnIndex(
                count(
                    $headers
                )
            );

        $this->styleHeader(
            $sheet,
            "A1:{$lastColumn}1"
        );

        $sheet
            ->getRowDimension(
                1
            )
            ->setRowHeight(
                28
            );

        $sheet
            ->freezePane(
                'A2'
            );

        $sheet
            ->setAutoFilter(
                "A1:{$lastColumn}1"
            );
    }

    private function styleHeader(
        Worksheet $sheet,
        string $range
    ): void {
        $style =
            $sheet->getStyle(
                $range
            );

        $style
            ->getFill()
            ->setFillType(
                Fill::FILL_SOLID
            )
            ->getStartColor()
            ->setARGB(
                self::COLOR_HEADER
            );

        $style
            ->getFont()
            ->setBold(
                true
            )
            ->setSize(
                10
            )
            ->getColor()
            ->setARGB(
                self::COLOR_WHITE
            );

        $style
            ->getAlignment()
            ->setHorizontal(
                Alignment::HORIZONTAL_CENTER
            )
            ->setVertical(
                Alignment::VERTICAL_CENTER
            )
            ->setWrapText(
                true
            );

        $this->applyBorders(
            $sheet,
            $range
        );
    }

    /*
    |--------------------------------------------------------------------------
    | STYLE BODY LAMA
    |--------------------------------------------------------------------------
    */

    private function styleBodyRow(
        Worksheet $sheet,
        int $row,
        int $columnCount
    ): void {
        $lastColumn =
            Coordinate::stringFromColumnIndex(
                $columnCount
            );

        $range =
            "A{$row}:{$lastColumn}{$row}";

        /*
         * Baris data pertama = abu muda,
         * baris berikutnya putih.
         *
         * Ini mengikuti export lama.
         */
        if (
            $row % 2 === 0
        ) {
            $sheet
                ->getStyle(
                    $range
                )
                ->getFill()
                ->setFillType(
                    Fill::FILL_SOLID
                )
                ->getStartColor()
                ->setARGB(
                    self::COLOR_ROW_ALT
                );
        }

        $sheet
            ->getStyle(
                $range
            )
            ->getFont()
            ->setSize(
                11
            )
            ->getColor()
            ->setARGB(
                self::COLOR_BLACK
            );

        $sheet
            ->getStyle(
                $range
            )
            ->getAlignment()
            ->setVertical(
                Alignment::VERTICAL_TOP
            )
            ->setWrapText(
                true
            );

        $this->applyBorders(
            $sheet,
            $range
        );
    }

    private function finishOldStyleTable(
        Worksheet $sheet,
        array $headers,
        int $lastRow
    ): void {
        $lastColumn =
            Coordinate::stringFromColumnIndex(
                count(
                    $headers
                )
            );

        if (
            $lastRow < 1
        ) {
            $lastRow =
                1;
        }

        $this->applyBorders(
            $sheet,
            "A1:{$lastColumn}{$lastRow}"
        );

        if (
            $lastRow >= 2
        ) {
            $sheet
                ->getStyle(
                    "A2:{$lastColumn}{$lastRow}"
                )
                ->getAlignment()
                ->setVertical(
                    Alignment::VERTICAL_TOP
                )
                ->setWrapText(
                    true
                );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | SECTION RINGKASAN
    |--------------------------------------------------------------------------
    */

    private function setSectionHeader(
        Worksheet $sheet,
        int $row,
        string $title,
        string $lastColumn
    ): void {
        $sheet->mergeCells(
            "A{$row}:{$lastColumn}{$row}"
        );

        $sheet->setCellValue(
            "A{$row}",
            $title
        );

        $sheet
            ->getStyle(
                "A{$row}:{$lastColumn}{$row}"
            )
            ->getFill()
            ->setFillType(
                Fill::FILL_SOLID
            )
            ->getStartColor()
            ->setARGB(
                self::COLOR_SECTION
            );

        $sheet
            ->getStyle(
                "A{$row}:{$lastColumn}{$row}"
            )
            ->getFont()
            ->setBold(
                true
            )
            ->getColor()
            ->setARGB(
                self::COLOR_SECTION_TEXT
            );

        $sheet
            ->getStyle(
                "A{$row}:{$lastColumn}{$row}"
            )
            ->getAlignment()
            ->setVertical(
                Alignment::VERTICAL_CENTER
            );
    }

    /*
    |--------------------------------------------------------------------------
    | BORDER
    |--------------------------------------------------------------------------
    */

    private function applyBorders(
        Worksheet $sheet,
        string $range
    ): void {
        $borders =
            $sheet
                ->getStyle(
                    $range
                )
                ->getBorders();

        $borders
            ->getAllBorders()
            ->setBorderStyle(
                Border::BORDER_THIN
            )
            ->getColor()
            ->setARGB(
                self::COLOR_BORDER
            );
    }

    /*
    |--------------------------------------------------------------------------
    | HYPERLINK
    |--------------------------------------------------------------------------
    */

    private function setHyperlinkCell(
        Worksheet $sheet,
        string $cell,
        mixed $url,
        string $label
    ): void {
        $normalizedUrl =
            $this->normalizeUrl(
                $url
            );

        if (
            !$normalizedUrl
        ) {
            $sheet->setCellValue(
                $cell,
                '-'
            );

            return;
        }

        $sheet->setCellValue(
            $cell,
            $label
        );

        $sheet
            ->getCell(
                $cell
            )
            ->getHyperlink()
            ->setUrl(
                $normalizedUrl
            );

        $sheet
            ->getStyle(
                $cell
            )
            ->getFont()
            ->getColor()
            ->setARGB(
                self::COLOR_LINK
            );

        $sheet
            ->getStyle(
                $cell
            )
            ->getFont()
            ->setUnderline(
                true
            );
    }

    private function normalizeUrl(
        mixed $url
    ): ?string {
        if (
            !$url
        ) {
            return null;
        }

        $url =
            trim(
                (string) $url
            );

        if (
            $url === ''
        ) {
            return null;
        }

        if (
            preg_match(
                '/^https?:\/\//i',
                $url
            )
        ) {
            return $url;
        }

        return 'https://' .
            ltrim(
                $url,
                '/'
            );
    }

    /*
    |--------------------------------------------------------------------------
    | WIDTH SEMUA LAYANAN
    |--------------------------------------------------------------------------
    */

    private function applyAllServicesWidths(
        Worksheet $sheet
    ): void {
        $widths = [
            'A' => 6,
            'B' => 26,
            'C' => 20,
            'D' => 24,
            'E' => 28,
            'F' => 24,
            'G' => 30,
            'H' => 20,
            'I' => 18,

            'J' => 14,
            'K' => 21,
            'L' => 30,
            'M' => 65,

            'N' => 20,
            'O' => 20,
            'P' => 20,

            'Q' => 30,
            'R' => 30,
            'S' => 30,

            'T' => 20,
            'U' => 22,

            'V' => 20,
            'W' => 20,

            'X' => 22,
            'Y' => 22,

            'Z' => 20,
        ];

        $this->applyWidths(
            $sheet,
            $widths
        );
    }

    /*
    |--------------------------------------------------------------------------
    | WIDTH MERCHANDISE
    |--------------------------------------------------------------------------
    */

    private function applyMerchandiseWidths(
        Worksheet $sheet
    ): void {
        $widths = [
            'A' => 6,
            'B' => 27,
            'C' => 24,
            'D' => 28,

            'E' => 28,
            'F' => 20,

            'G' => 24,
            'H' => 22,
            'I' => 22,

            'J' => 36,
            'K' => 14,

            'L' => 20,
            'M' => 18,

            'N' => 14,
            'O' => 22,
            'P' => 24,
            'Q' => 32,
            'R' => 68,

            'S' => 20,
            'T' => 20,
            'U' => 20,

            'V' => 30,
            'W' => 32,
            'X' => 32,

            'Y' => 20,
            'Z' => 20,
            'AA' => 20,
            'AB' => 20,
        ];

        $this->applyWidths(
            $sheet,
            $widths
        );
    }

    /*
    |--------------------------------------------------------------------------
    | WIDTH HUMAS
    |--------------------------------------------------------------------------
    */

    private function applyHumasWidths(
        Worksheet $sheet
    ): void {
        $widths = [
            'A' => 6,
            'B' => 27,

            'C' => 24,
            'D' => 28,

            'E' => 24,
            'F' => 22,

            'G' => 45,
            'H' => 24,
            'I' => 24,

            'J' => 22,
            'K' => 20,

            'L' => 18,

            'M' => 20,
            'N' => 20,
            'O' => 20,

            'P' => 30,
            'Q' => 30,

            'R' => 21,
            'S' => 21,

            'T' => 21,
            'U' => 21,
            'V' => 35,

            'W' => 20,
        ];

        $this->applyWidths(
            $sheet,
            $widths
        );
    }

    /*
    |--------------------------------------------------------------------------
    | WIDTH BORROWING
    |--------------------------------------------------------------------------
    */

    private function applyBorrowingWidths(
        Worksheet $sheet
    ): void {
        $widths = [
            'A' => 6,
            'B' => 28,

            'C' => 24,
            'D' => 28,

            'E' => 40,

            'F' => 20,
            'G' => 20,

            'H' => 38,
            'I' => 15,

            'J' => 20,
            'K' => 18,

            'L' => 20,
            'M' => 20,

            'N' => 20,
            'O' => 20,

            'P' => 30,
            'Q' => 30,

            'R' => 20,
            'S' => 20,

            'T' => 24,
            'U' => 24,

            'V' => 20,
        ];

        $this->applyWidths(
            $sheet,
            $widths
        );
    }

    private function applyWidths(
        Worksheet $sheet,
        array $widths
    ): void {
        foreach (
            $widths as
            $column =>
            $width
        ) {
            $sheet
                ->getColumnDimension(
                    $column
                )
                ->setWidth(
                    $width
                );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | LABEL
    |--------------------------------------------------------------------------
    */

    private function serviceLabel(
        ?string $service
    ): string {
        return match (
            $service
        ) {
            'merchandise' =>
                'Merchandise',

            'humas' =>
                'Liputan Humas',

            'borrowing' =>
                'Peminjaman SEKPiM',

            'all',
            null,
            '' =>
                'Semua Layanan',

            default =>
                ucfirst(
                    (string) $service
                ),
        };
    }

    private function statusLabel(
        ?string $status
    ): string {
        return match (
            $status
        ) {
            'pending' =>
                'Menunggu',

            'revision' =>
                'Perlu Revisi',

            'approved' =>
                'Disetujui',

            'rejected' =>
                'Ditolak',

            'completed' =>
                'Selesai',

            'borrowed' =>
                'Sedang Dipinjam',

            'returned' =>
                'Dikembalikan',

            'all',
            null,
            '' =>
                'Semua Status',

            default =>
                ucfirst(
                    (string) $status
                ),
        };
    }

    /*
    |--------------------------------------------------------------------------
    | FORMAT PERIODE
    |--------------------------------------------------------------------------
    */

    private function formatPeriod(
        mixed $startDate,
        mixed $endDate
    ): string {
        if (
            !$startDate ||
            !$endDate
        ) {
            return '-';
        }

        try {
            return Carbon::parse(
                $startDate
            )->format(
                'd-m-Y'
            ) .
                ' s.d. ' .
                Carbon::parse(
                    $endDate
                )->format(
                    'd-m-Y'
                );
        } catch (
            \Throwable
        ) {
            return '-';
        }
    }

    /*
    |--------------------------------------------------------------------------
    | FORMAT TANGGAL
    |--------------------------------------------------------------------------
    */

    private function formatDate(
        mixed $value
    ): string {
        if (
            !$value
        ) {
            return '-';
        }

        try {
            return Carbon::parse(
                $value
            )->format(
                'd-m-Y'
            );
        } catch (
            \Throwable
        ) {
            return '-';
        }
    }

    private function formatDateTime(
        mixed $value
    ): string {
        if (
            !$value
        ) {
            return '-';
        }

        try {
            return Carbon::parse(
                $value
            )->format(
                'd-m-Y H:i'
            );
        } catch (
            \Throwable
        ) {
            return '-';
        }
    }
}