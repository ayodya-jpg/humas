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
    | Warna Export
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
        | Layanan Humas
        |--------------------------------------------------------------------------
        */

        $humasSheet =
            $spreadsheet
                ->createSheet();

        $humasSheet
            ->setTitle(
                'Layanan Humas'
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
            'Pengajuan dengan Lampiran User'
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
                'Layanan Humas',

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
        $headers = [
            'No',
            'Kode Pengajuan',
            'Jenis Layanan',
            'Nama Pemohon',
            'Email Pemohon',
            'Unit / Instansi',
            'Judul / Kegiatan',

            'Nama PIC',
            'Nomor PIC',
            'Tanggal Pengambilan Merchandise',

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

            'Lampiran User',
            'Link Referensi User',

            'File / Bukti Admin',
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
                $item[
                    'pic_name'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "I{$row}",
                $item[
                    'pic_phone'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "J{$row}",
                $this->formatDate(
                    $item[
                        'pickup_date'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "K{$row}",
                $this->formatDateTime(
                    $item[
                        'submitted_at'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "L{$row}",
                $this->statusLabel(
                    $item[
                        'status'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "M{$row}",
                $item[
                    'revision_count'
                ] ?? 0
            );

            $sheet->setCellValue(
                "N{$row}",
                $this->formatDateTime(
                    $item[
                        'latest_revision_at'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "O{$row}",
                $item[
                    'latest_revision_reason'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "P{$row}",
                $item[
                    'revision_history_text'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "Q{$row}",
                $this->formatDateTime(
                    $item[
                        'approved_at'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "R{$row}",
                $this->formatDateTime(
                    $item[
                        'rejected_at'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "S{$row}",
                $this->formatDateTime(
                    $item[
                        'completed_at'
                    ] ?? null
                )
            );

            $sheet->setCellValue(
                "T{$row}",
                $item[
                    'rejection_reason'
                ] ?? '-'
            );

            $sheet->setCellValue(
                "U{$row}",
                $item[
                    'admin_note'
                ] ?? '-'
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
                    'user_evidence_url'
                ] ?? null,
                'Buka Lampiran User'
            );

            $this->setHyperlinkCell(
                $sheet,
                "X{$row}",
                $item[
                    'user_reference_link'
                ] ?? null,
                'Buka Referensi'
            );

            $this->setHyperlinkCell(
                $sheet,
                "Y{$row}",
                $item[
                    'admin_evidence_url'
                ] ?? null,
                'Buka File Admin'
            );

            $this->setHyperlinkCell(
                $sheet,
                "Z{$row}",
                $item[
                    'admin_result_link'
                ] ?? null,
                'Buka Hasil Admin'
            );

            $this->setHyperlinkCell(
                $sheet,
                "AA{$row}",
                $item[
                    'handover_evidence_url'
                ] ?? null,
                'Buka Serah Terima'
            );

            $this->setHyperlinkCell(
                $sheet,
                "AB{$row}",
                $item[
                    'return_evidence_url'
                ] ?? null,
                'Buka Pengembalian'
            );

            $this->setHyperlinkCell(
                $sheet,
                "AC{$row}",
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

            'Nama PIC',
            'Nomor PIC',
            'Tanggal Pengambilan Merchandise',

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

            'Bukti / Lampiran User',
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
                    'pic_name'
                ] ?? '-',

                $item[
                    'pic_phone'
                ] ?? '-',

                $this->formatDate(
                    $item[
                        'pickup_date'
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
                "AB{$row}",
                $item[
                    'user_evidence_url'
                ] ?? null,
                'Buka File User'
            );

            $this->setHyperlinkCell(
                $sheet,
                "AC{$row}",
                $item[
                    'user_reference_link'
                ] ?? null,
                'Buka Link User'
            );

            $this->setHyperlinkCell(
                $sheet,
                "AD{$row}",
                $item[
                    'admin_evidence_url'
                ] ?? null,
                'Buka Bukti Admin'
            );

            $this->setHyperlinkCell(
                $sheet,
                "AE{$row}",
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
    | LAYANAN HUMAS
    |--------------------------------------------------------------------------
    */

    private function buildHumasSheet(
        Worksheet $sheet,
        Collection $requests
    ): void {
        $headers = [
            'No',
            'Kode Request',

            'Nama Pemohon',
            'Email Pemohon',

            'Nama Unit / Prodi',
            'Kontak WhatsApp PIC',

            'Detail Kegiatan',
            'Jenis Layanan Humas',
            'Lokasi Acara',

            'Pelaksanaan Kegiatan',
            'Waktu Pengajuan',

            'Status',

            'Tanggal Disetujui',
            'Tanggal Ditolak',
            'Tanggal Selesai',

            'Alasan Penolakan',
            'Catatan Admin',

            'Lampiran / Brief Kegiatan',
            'Link Referensi User',

            'File Hasil Admin',
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

                /*
                 * coverage_label sudah dinormalisasi
                 * DashboardController.
                 *
                 * REQUEST DESIGN INSTAGRAM
                 * → Request Design Instagram
                 *
                 * PUBLIKASI MEDIA MASSA
                 * → Publikasi Media Massa
                 *
                 * SOCIAL MEDIA legacy
                 * → Social Media (Data Lama)
                 */
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

            /*
             * R = Lampiran / Brief User
             */
            $this->setHyperlinkCell(
                $sheet,
                "R{$row}",
                $item[
                    'user_evidence_url'
                ] ?? null,
                'Buka Lampiran / Brief'
            );

            /*
             * S = Link Referensi User
             */
            $this->setHyperlinkCell(
                $sheet,
                "S{$row}",
                $item[
                    'user_reference_link'
                ] ?? null,
                'Buka Referensi'
            );

            /*
             * T = File Hasil Admin
             */
            $this->setHyperlinkCell(
                $sheet,
                "T{$row}",
                $item[
                    'admin_evidence_url'
                ] ?? null,
                'Buka File Hasil'
            );

            /*
             * U = Link Hasil Humas
             */
            $this->setHyperlinkCell(
                $sheet,
                "U{$row}",
                $item[
                    'admin_result_link'
                ] ?? null,
                'Buka Hasil Humas'
            );

            /*
             * V = Catatan Hasil
             */
            $sheet->setCellValue(
                "V{$row}",
                $item[
                    'admin_result_note'
                ] ?? '-'
            );

            /*
             * W = Detail
             */
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
    | HEADER TABEL
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
                    $index +
                    1
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
    | BODY TABEL
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

        if (
            $row % 2 ===
            0
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
            $lastRow <
            1
        ) {
            $lastRow =
                1;
        }

        $this->applyBorders(
            $sheet,
            "A1:{$lastColumn}{$lastRow}"
        );

        if (
            $lastRow >=
            2
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
        $sheet
            ->getStyle(
                $range
            )
            ->getBorders()
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
                (string)
                $url
            );

        if (
            $url ===
            ''
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
    | LEBAR KOLOM SEMUA LAYANAN
    |--------------------------------------------------------------------------
    */

    private function applyAllServicesWidths(
        Worksheet $sheet
    ): void {
        $widths = [
            'A' => 6,
            'B' => 26,
            'C' => 22,
            'D' => 24,
            'E' => 28,
            'F' => 24,
            'G' => 32,

            'H' => 24,
            'I' => 20,
            'J' => 26,

            'K' => 20,
            'L' => 18,

            'M' => 14,
            'N' => 21,
            'O' => 30,
            'P' => 65,

            'Q' => 20,
            'R' => 20,
            'S' => 20,

            'T' => 30,
            'U' => 30,
            'V' => 30,

            'W' => 22,
            'X' => 22,

            'Y' => 22,
            'Z' => 22,

            'AA' => 22,
            'AB' => 22,

            'AC' => 20,
        ];

        $this->applyWidths(
            $sheet,
            $widths
        );
    }

    /*
    |--------------------------------------------------------------------------
    | LEBAR KOLOM MERCHANDISE
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
            'H' => 20,
            'I' => 26,

            'J' => 24,
            'K' => 22,
            'L' => 22,

            'M' => 36,
            'N' => 14,

            'O' => 20,
            'P' => 18,

            'Q' => 14,
            'R' => 22,
            'S' => 24,
            'T' => 32,
            'U' => 68,

            'V' => 20,
            'W' => 20,
            'X' => 20,

            'Y' => 30,
            'Z' => 32,
            'AA' => 32,

            'AB' => 22,
            'AC' => 22,
            'AD' => 22,
            'AE' => 20,
        ];

        $this->applyWidths(
            $sheet,
            $widths
        );
    }

    /*
    |--------------------------------------------------------------------------
    | LEBAR KOLOM LAYANAN HUMAS
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

            /*
             * Lebih lebar karena
             * "Request Design Instagram"
             * dan
             * "Publikasi Media Massa".
             */
            'H' => 30,

            'I' => 24,

            'J' => 22,
            'K' => 20,

            'L' => 18,

            'M' => 20,
            'N' => 20,
            'O' => 20,

            'P' => 30,
            'Q' => 30,

            'R' => 26,
            'S' => 22,

            'T' => 22,
            'U' => 22,
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
    | LEBAR KOLOM PEMINJAMAN
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
    | LABEL LAYANAN
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
                'Layanan Humas',

            'borrowing' =>
                'Peminjaman SEKPiM',

            'all',
            null,
            '' =>
                'Semua Layanan',

            default =>
                ucfirst(
                    (string)
                    $service
                ),
        };
    }

    /*
    |--------------------------------------------------------------------------
    | LABEL STATUS
    |--------------------------------------------------------------------------
    */

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
                    (string)
                    $status
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