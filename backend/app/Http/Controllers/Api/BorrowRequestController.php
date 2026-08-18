<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BorrowRequest;
use App\Models\BorrowRequestItem;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class BorrowRequestController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | REQUEST TYPES
    |--------------------------------------------------------------------------
    */

    private const TYPE_BORROW =
        'borrow';

    private const TYPE_ASSET_REQUEST =
        'asset_request';

    private const REQUEST_TYPES = [
        self::TYPE_BORROW,
        self::TYPE_ASSET_REQUEST,
    ];

    /*
    |--------------------------------------------------------------------------
    | ACTIVE BORROW STATUSES
    |--------------------------------------------------------------------------
    |
    | Selama user mempunyai Peminjaman Barang pada salah satu status
    | berikut, user tidak dapat membuat Peminjaman Barang baru.
    |
    | Rule ini TIDAK berlaku untuk Request Barang.
    |
    */

    private const ACTIVE_BORROW_STATUSES = [
        'pending',
        'approved',
        'borrowed',
    ];

    /*
    |--------------------------------------------------------------------------
    | INDEX
    |--------------------------------------------------------------------------
    */

    public function index(
        Request $request
    ): JsonResponse {
        $user =
            $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'approval.borrowing.view'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin melihat seluruh pengajuan SEKPiM.'
            );
        }

        $borrowRequests =
            BorrowRequest::query()
                ->with([
                    'user',
                    'items.product.category',
                ])
                ->latest(
                    'submitted_at'
                )
                ->latest(
                    'created_at'
                )
                ->get();

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Data pengajuan SEKPiM berhasil diambil.',

            'data' =>
                $borrowRequests,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | MY REQUESTS
    |--------------------------------------------------------------------------
    */

    public function myBorrowRequests(
        Request $request
    ): JsonResponse {
        $user =
            $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'request.history.view'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin melihat riwayat pengajuan SEKPiM.'
            );
        }

        $borrowRequests =
            BorrowRequest::query()
                ->with([
                    'user',
                    'items.product.category',
                ])
                ->where(
                    'user_id',
                    $user->id
                )
                ->latest(
                    'submitted_at'
                )
                ->latest(
                    'created_at'
                )
                ->get();

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Riwayat pengajuan SEKPiM berhasil diambil.',

            'data' =>
                $borrowRequests,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SHOW
    |--------------------------------------------------------------------------
    */

    public function show(
        Request $request,
        int $id
    ): JsonResponse {
        $borrowRequest =
            BorrowRequest::query()
                ->with([
                    'user',
                    'items.product.category',
                ])
                ->findOrFail(
                    $id
                );

        if (
            !$this->canAccessBorrowRequest(
                $request,
                $borrowRequest
            )
        ) {
            return $this->forbiddenResponse(
                'Akses ditolak. Kamu tidak memiliki izin melihat pengajuan SEKPiM ini.'
            );
        }

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Detail pengajuan SEKPiM berhasil diambil.',

            'data' =>
                $borrowRequest,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | STORE
    |--------------------------------------------------------------------------
    |
    | Membuat:
    |
    | 1. Peminjaman Barang
    |    request_type = borrow
    |
    | 2. Request Barang
    |    request_type = asset_request
    |
    */

    public function store(
        Request $request
    ): JsonResponse {
        $user =
            $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'request.borrowing.create'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin membuat pengajuan SEKPiM.'
            );
        }

        /*
         * Tanggal kegiatan minimal H-4.
         */
        $minimumActivityDate =
            now()
                ->startOfDay()
                ->addDays(
                    4
                )
                ->toDateString();

        $today =
            now()
                ->startOfDay()
                ->toDateString();

        $validated =
            $request->validate([
                'request_type' => [
                    'required',

                    Rule::in(
                        self::REQUEST_TYPES
                    ),
                ],

                'pic_name' => [
                    'required',
                    'string',
                    'min:3',
                    'max:255',
                ],

                'pic_phone' => [
                    'required',
                    'string',
                    'min:8',
                    'max:30',
                    'regex:/^[0-9+\-\s().]+$/',
                ],

                'purpose' => [
                    'required',
                    'string',
                    'min:5',
                    'max:3000',
                ],

                /*
                 * Rule H-4.
                 */
                'activity_date' => [
                    'required',
                    'date',
                    'after_or_equal:' .
                        $minimumActivityDate,
                ],

                /*
                 * borrow_date sekarang berfungsi sebagai
                 * Tanggal Pengambilan.
                 *
                 * Sama seperti Merchandise:
                 *
                 * hari ini <= tanggal pengambilan <= tanggal kegiatan
                 */
                'borrow_date' => [
                    'required',
                    'date',
                    'after_or_equal:' .
                        $today,
                    'before_or_equal:activity_date',
                ],

                /*
                 * Hanya wajib pada Peminjaman Barang.
                 *
                 * Untuk Request Barang akan disimpan NULL.
                 */
                'return_date' => [
                    'nullable',
                    'date',
                    'after_or_equal:borrow_date',
                ],

                'items' => [
                    'required',
                    'array',
                    'min:1',
                ],

                'items.*.product_id' => [
                    'required',
                    'integer',
                    'distinct',
                    'exists:products,id',
                ],

                'items.*.quantity' => [
                    'required',
                    'integer',
                    'min:1',
                ],
            ], [
                'request_type.required' =>
                    'Jenis pengajuan wajib dipilih.',

                'request_type.in' =>
                    'Jenis pengajuan tidak valid.',

                'pic_name.required' =>
                    'Nama PIC wajib diisi.',

                'pic_name.min' =>
                    'Nama PIC minimal tiga karakter.',

                'pic_name.max' =>
                    'Nama PIC maksimal 255 karakter.',

                'pic_phone.required' =>
                    'Nomor PIC wajib diisi.',

                'pic_phone.min' =>
                    'Nomor PIC minimal delapan karakter.',

                'pic_phone.max' =>
                    'Nomor PIC maksimal 30 karakter.',

                'pic_phone.regex' =>
                    'Format nomor PIC tidak valid.',

                'purpose.required' =>
                    'Keperluan pengajuan wajib diisi.',

                'purpose.min' =>
                    'Keperluan pengajuan minimal lima karakter.',

                'purpose.max' =>
                    'Keperluan pengajuan maksimal 3.000 karakter.',

                'activity_date.required' =>
                    'Tanggal kegiatan wajib diisi.',

                'activity_date.date' =>
                    'Format tanggal kegiatan tidak valid.',

                'activity_date.after_or_equal' =>
                    'Pengajuan harus dilakukan minimal H-4 sebelum tanggal kegiatan.',

                'borrow_date.required' =>
                    'Tanggal pengambilan wajib diisi.',

                'borrow_date.date' =>
                    'Format tanggal pengambilan tidak valid.',

                'borrow_date.after_or_equal' =>
                    'Tanggal pengambilan tidak boleh sebelum hari ini.',

                'borrow_date.before_or_equal' =>
                    'Tanggal pengambilan tidak boleh setelah tanggal kegiatan.',

                'return_date.date' =>
                    'Format tanggal pengembalian tidak valid.',

                'return_date.after_or_equal' =>
                    'Tanggal pengembalian tidak boleh sebelum tanggal pengambilan.',

                'items.required' =>
                    'Pilih minimal satu barang.',

                'items.array' =>
                    'Data barang tidak valid.',

                'items.min' =>
                    'Pilih minimal satu barang.',

                'items.*.product_id.required' =>
                    'Produk wajib dipilih.',

                'items.*.product_id.exists' =>
                    'Salah satu produk tidak ditemukan.',

                'items.*.product_id.distinct' =>
                    'Produk yang sama tidak boleh dikirim lebih dari satu kali.',

                'items.*.quantity.required' =>
                    'Jumlah barang wajib diisi.',

                'items.*.quantity.integer' =>
                    'Jumlah barang harus berupa bilangan bulat.',

                'items.*.quantity.min' =>
                    'Jumlah barang minimal satu.',
            ]);

        /*
         * Peminjaman Barang wajib mempunyai tanggal pengembalian.
         */
        if (
            $validated[
                'request_type'
            ] ===
                self::TYPE_BORROW &&
            empty(
                $validated[
                    'return_date'
                ]
            )
        ) {
            $this->abortJson(
                'Tanggal pengembalian wajib diisi untuk Peminjaman Barang.',
                422
            );
        }

        /*
         * Request Barang tidak mempunyai tanggal pengembalian.
         */
        if (
            $validated[
                'request_type'
            ] ===
            self::TYPE_ASSET_REQUEST
        ) {
            $validated[
                'return_date'
            ] =
                null;
        }

        try {
            $borrowRequest =
                DB::transaction(
                    function () use (
                        $user,
                        $validated
                    ): BorrowRequest {
                        /*
                         * Lock user supaya dua request BORROW
                         * tidak dapat masuk bersamaan dari dua tab/device.
                         */
                        $lockedUser =
                            User::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $user->id
                                );

                        /*
                         * Rule satu Peminjaman Barang aktif.
                         *
                         * Request Barang tidak terkena rule ini.
                         */
                        if (
                            $validated[
                                'request_type'
                            ] ===
                            self::TYPE_BORROW
                        ) {
                            $this->ensureNoActiveBorrow(
                                $lockedUser
                            );
                        }

                        /*
                         * Validasi produk berdasarkan jenis request.
                         */
                        $this->validateRequestItems(
                            $validated[
                                'items'
                            ],
                            $validated[
                                'request_type'
                            ]
                        );

                        $borrowRequest =
                            BorrowRequest::query()
                                ->create([
                                    'user_id' =>
                                        $lockedUser->id,

                                    'borrow_code' =>
                                        $this->generateRequestCode(
                                            $validated[
                                                'request_type'
                                            ]
                                        ),

                                    'request_type' =>
                                        $validated[
                                            'request_type'
                                        ],

                                    'pic_name' =>
                                        trim(
                                            $validated[
                                                'pic_name'
                                            ]
                                        ),

                                    'pic_phone' =>
                                        trim(
                                            $validated[
                                                'pic_phone'
                                            ]
                                        ),

                                    'purpose' =>
                                        trim(
                                            $validated[
                                                'purpose'
                                            ]
                                        ),

                                    'activity_date' =>
                                        $validated[
                                            'activity_date'
                                        ],

                                    'borrow_date' =>
                                        $validated[
                                            'borrow_date'
                                        ],

                                    'return_date' =>
                                        $validated[
                                            'return_date'
                                        ] ?? null,

                                    'status' =>
                                        'pending',

                                    'admin_note' =>
                                        null,

                                    'handover_evidence_path' =>
                                        null,

                                    'handover_evidence_name' =>
                                        null,

                                    'handover_evidence_mime' =>
                                        null,

                                    'return_evidence_path' =>
                                        null,

                                    'return_evidence_name' =>
                                        null,

                                    'return_evidence_mime' =>
                                        null,

                                    'submitted_at' =>
                                        now(),

                                    'approved_at' =>
                                        null,

                                    'rejected_at' =>
                                        null,

                                    'borrowed_at' =>
                                        null,

                                    'returned_at' =>
                                        null,

                                    'completed_at' =>
                                        null,
                                ]);

                        foreach (
                            $validated[
                                'items'
                            ] as
                            $item
                        ) {
                            BorrowRequestItem::query()
                                ->create([
                                    'borrow_request_id' =>
                                        $borrowRequest
                                            ->id,

                                    'product_id' =>
                                        $item[
                                            'product_id'
                                        ],

                                    'quantity' =>
                                        $item[
                                            'quantity'
                                        ],
                                ]);
                        }

                        return $borrowRequest
                            ->load([
                                'user',
                                'items.product.category',
                            ]);
                    }
                );

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    $borrowRequest
                        ->request_type ===
                    self::TYPE_ASSET_REQUEST
                        ? 'Request barang berhasil dikirim.'
                        : 'Pengajuan peminjaman barang berhasil dikirim.',

                'data' =>
                    $borrowRequest,
            ], 201);
        } catch (
            HttpResponseException $error
        ) {
            throw $error;
        } catch (
            Throwable $error
        ) {
            report(
                $error
            );

            return response()->json([
                'success' =>
                    false,

                'message' =>
                    app()->isLocal()
                        ? $error->getMessage()
                        : 'Pengajuan SEKPiM gagal dikirim. Silakan periksa kembali data pengajuan.',

                'data' =>
                    null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | APPROVE
    |--------------------------------------------------------------------------
    |
    | Berlaku untuk:
    |
    | - Peminjaman Barang
    | - Request Barang
    |
    | Stok BELUM dikurangi saat approve.
    |
    */

    public function approve(
        Request $request,
        int $id
    ): JsonResponse {
        if (
            !$this->canProcessBorrowRequest(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin menyetujui pengajuan SEKPiM.'
            );
        }

        try {
            $borrowRequest =
                DB::transaction(
                    function () use (
                        $id
                    ): BorrowRequest {
                        $lockedRequest =
                            BorrowRequest::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $id
                                );

                        if (
                            $lockedRequest
                                ->status !==
                            'pending'
                        ) {
                            $this->abortJson(
                                'Pengajuan hanya bisa disetujui saat status masih menunggu.',
                                422
                            );
                        }

                        $lockedRequest
                            ->load([
                                'items.product',
                            ]);

                        if (
                            $lockedRequest
                                ->items
                                ->isEmpty()
                        ) {
                            $this->abortJson(
                                'Pengajuan tidak memiliki item barang.',
                                422
                            );
                        }

                        /*
                         * Validasi ulang karena stok/status produk
                         * dapat berubah sejak user submit.
                         */
                        $items =
                            $lockedRequest
                                ->items
                                ->map(
                                    fn (
                                        BorrowRequestItem $item
                                    ): array => [
                                        'product_id' =>
                                            $item
                                                ->product_id,

                                        'quantity' =>
                                            $item
                                                ->quantity,
                                    ]
                                )
                                ->values()
                                ->all();

                        $this->validateRequestItems(
                            $items,
                            $lockedRequest
                                ->request_type
                                ?: self::TYPE_BORROW
                        );

                        $lockedRequest
                            ->update([
                                'status' =>
                                    'approved',

                                'admin_note' =>
                                    null,

                                'approved_at' =>
                                    now(),

                                'rejected_at' =>
                                    null,

                                'borrowed_at' =>
                                    null,

                                'returned_at' =>
                                    null,

                                'completed_at' =>
                                    null,
                            ]);

                        return $lockedRequest
                            ->fresh([
                                'user',
                                'items.product.category',
                            ]);
                    }
                );

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    $borrowRequest
                        ->request_type ===
                    self::TYPE_ASSET_REQUEST
                        ? 'Request barang berhasil disetujui.'
                        : 'Pengajuan peminjaman barang berhasil disetujui.',

                'data' =>
                    $borrowRequest,
            ]);
        } catch (
            HttpResponseException $error
        ) {
            throw $error;
        } catch (
            Throwable $error
        ) {
            report(
                $error
            );

            return response()->json([
                'success' =>
                    false,

                'message' =>
                    app()->isLocal()
                        ? $error->getMessage()
                        : 'Approval pengajuan SEKPiM gagal diproses.',

                'data' =>
                    null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | REJECT
    |--------------------------------------------------------------------------
    */

    public function reject(
        Request $request,
        int $id
    ): JsonResponse {
        if (
            !$this->canProcessBorrowRequest(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin menolak pengajuan SEKPiM.'
            );
        }

        $validated =
            $request->validate([
                'admin_note' => [
                    'required',
                    'string',
                    'min:5',
                    'max:2000',
                ],
            ], [
                'admin_note.required' =>
                    'Alasan penolakan wajib diisi.',

                'admin_note.min' =>
                    'Alasan penolakan minimal lima karakter.',

                'admin_note.max' =>
                    'Alasan penolakan maksimal 2.000 karakter.',
            ]);

        try {
            $borrowRequest =
                DB::transaction(
                    function () use (
                        $id,
                        $validated
                    ): BorrowRequest {
                        $lockedRequest =
                            BorrowRequest::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $id
                                );

                        if (
                            $lockedRequest
                                ->status !==
                            'pending'
                        ) {
                            $this->abortJson(
                                'Pengajuan hanya bisa ditolak saat status masih menunggu.',
                                422
                            );
                        }

                        $lockedRequest
                            ->update([
                                'status' =>
                                    'rejected',

                                'admin_note' =>
                                    trim(
                                        $validated[
                                            'admin_note'
                                        ]
                                    ),

                                'rejected_at' =>
                                    now(),

                                'approved_at' =>
                                    null,

                                'borrowed_at' =>
                                    null,

                                'returned_at' =>
                                    null,

                                'completed_at' =>
                                    null,
                            ]);

                        return $lockedRequest
                            ->fresh([
                                'user',
                                'items.product.category',
                            ]);
                    }
                );

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    $borrowRequest
                        ->request_type ===
                    self::TYPE_ASSET_REQUEST
                        ? 'Request barang berhasil ditolak.'
                        : 'Pengajuan peminjaman barang berhasil ditolak.',

                'data' =>
                    $borrowRequest,
            ]);
        } catch (
            HttpResponseException $error
        ) {
            throw $error;
        } catch (
            Throwable $error
        ) {
            report(
                $error
            );

            return response()->json([
                'success' =>
                    false,

                'message' =>
                    app()->isLocal()
                        ? $error->getMessage()
                        : 'Penolakan pengajuan SEKPiM gagal diproses.',

                'data' =>
                    null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | BORROWED
    |--------------------------------------------------------------------------
    |
    | KHUSUS request_type = borrow.
    |
    | approved
    |     ↓
    | borrowed
    |
    | - Bukti serah terima wajib.
    | - Stok dikurangi.
    |
    */

    public function borrowed(
        Request $request,
        int $id
    ): JsonResponse {
        if (
            !$this->canProcessBorrowRequest(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin memproses penyerahan barang.'
            );
        }

        $validated =
            $request->validate([
                'handover_evidence' => [
                    'required',
                    'file',
                    'mimes:pdf,jpg,jpeg,png',
                    'max:10240',
                ],
            ], [
                'handover_evidence.required' =>
                    'Bukti serah terima wajib diunggah.',

                'handover_evidence.file' =>
                    'Bukti serah terima tidak valid.',

                'handover_evidence.mimes' =>
                    'Bukti serah terima harus berformat PDF, JPG, JPEG, atau PNG.',

                'handover_evidence.max' =>
                    'Ukuran bukti serah terima maksimal 10 MB.',
            ]);

        $evidencePath =
            null;

        try {
            $evidenceFile =
                $request->file(
                    'handover_evidence'
                );

            $evidencePath =
                $evidenceFile->store(
                    'borrowing-handover-evidence',
                    'public'
                );

            $borrowRequest =
                DB::transaction(
                    function () use (
                        $id,
                        $evidenceFile,
                        $evidencePath
                    ): BorrowRequest {
                        $lockedRequest =
                            BorrowRequest::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $id
                                );

                        /*
                         * Asset Request tidak boleh memakai endpoint borrowed.
                         */
                        if (
                            (
                                $lockedRequest
                                    ->request_type
                                ?: self::TYPE_BORROW
                            ) !==
                            self::TYPE_BORROW
                        ) {
                            $this->abortJson(
                                'Request Barang tidak menggunakan proses peminjaman. Gunakan proses serah terima Request Barang.',
                                422
                            );
                        }

                        if (
                            $lockedRequest
                                ->status !==
                            'approved'
                        ) {
                            $this->abortJson(
                                'Barang hanya bisa diserahkan setelah pengajuan disetujui.',
                                422
                            );
                        }

                        $lockedRequest
                            ->load([
                                'items.product',
                            ]);

                        if (
                            $lockedRequest
                                ->items
                                ->isEmpty()
                        ) {
                            $this->abortJson(
                                'Pengajuan tidak memiliki item barang.',
                                422
                            );
                        }

                        /*
                         * Lock semua produk dan pastikan stok tersedia.
                         */
                        foreach (
                            $lockedRequest
                                ->items as
                            $item
                        ) {
                            $product =
                                Product::query()
                                    ->lockForUpdate()
                                    ->find(
                                        $item
                                            ->product_id
                                    );

                            if (
                                !$product
                            ) {
                                $this->abortJson(
                                    'Salah satu barang tidak ditemukan.',
                                    422
                                );
                            }

                            $this->validateProductForRequest(
                                $product,
                                self::TYPE_BORROW,
                                (int)
                                    $item
                                        ->quantity
                            );
                        }

                        /*
                         * Baru kurangi stok setelah SEMUA valid.
                         */
                        foreach (
                            $lockedRequest
                                ->items as
                            $item
                        ) {
                            $product =
                                Product::query()
                                    ->lockForUpdate()
                                    ->findOrFail(
                                        $item
                                            ->product_id
                                    );

                            $product->decrement(
                                'stock',
                                (int)
                                    $item
                                        ->quantity
                            );
                        }

                        $lockedRequest
                            ->update([
                                'status' =>
                                    'borrowed',

                                'handover_evidence_path' =>
                                    $evidencePath,

                                'handover_evidence_name' =>
                                    $evidenceFile
                                        ->getClientOriginalName(),

                                'handover_evidence_mime' =>
                                    $evidenceFile
                                        ->getMimeType(),

                                'borrowed_at' =>
                                    now(),

                                'returned_at' =>
                                    null,

                                'completed_at' =>
                                    null,
                            ]);

                        return $lockedRequest
                            ->fresh([
                                'user',
                                'items.product.category',
                            ]);
                    }
                );

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Barang berhasil diserahkan. Status peminjaman sekarang sedang dipinjam.',

                'data' =>
                    $borrowRequest,
            ]);
        } catch (
            HttpResponseException $error
        ) {
            $this->deleteFileIfExists(
                $evidencePath
            );

            throw $error;
        } catch (
            Throwable $error
        ) {
            $this->deleteFileIfExists(
                $evidencePath
            );

            report(
                $error
            );

            return response()->json([
                'success' =>
                    false,

                'message' =>
                    app()->isLocal()
                        ? $error->getMessage()
                        : 'Proses penyerahan barang gagal dilakukan.',

                'data' =>
                    null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | RETURNED
    |--------------------------------------------------------------------------
    |
    | KHUSUS request_type = borrow.
    |
    | borrowed
    |     ↓
    | returned
    |
    | - Evidence pengembalian wajib.
    | - Stok dikembalikan.
    | - Setelah RETURNED, user boleh meminjam lagi.
    |
    */

    public function returned(
        Request $request,
        int $id
    ): JsonResponse {
        if (
            !$this->canProcessBorrowRequest(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin memproses pengembalian barang.'
            );
        }

        $validated =
            $request->validate([
                'return_evidence' => [
                    'required',
                    'file',
                    'mimes:pdf,jpg,jpeg,png',
                    'max:10240',
                ],
            ], [
                'return_evidence.required' =>
                    'Bukti pengembalian wajib diunggah.',

                'return_evidence.file' =>
                    'Bukti pengembalian tidak valid.',

                'return_evidence.mimes' =>
                    'Bukti pengembalian harus berformat PDF, JPG, JPEG, atau PNG.',

                'return_evidence.max' =>
                    'Ukuran bukti pengembalian maksimal 10 MB.',
            ]);

        $evidencePath =
            null;

        try {
            $evidenceFile =
                $request->file(
                    'return_evidence'
                );

            $evidencePath =
                $evidenceFile->store(
                    'borrowing-return-evidence',
                    'public'
                );

            $borrowRequest =
                DB::transaction(
                    function () use (
                        $id,
                        $evidenceFile,
                        $evidencePath
                    ): BorrowRequest {
                        $lockedRequest =
                            BorrowRequest::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $id
                                );

                        if (
                            (
                                $lockedRequest
                                    ->request_type
                                ?: self::TYPE_BORROW
                            ) !==
                            self::TYPE_BORROW
                        ) {
                            $this->abortJson(
                                'Request Barang tidak memiliki proses pengembalian.',
                                422
                            );
                        }

                        if (
                            $lockedRequest
                                ->status !==
                            'borrowed'
                        ) {
                            $this->abortJson(
                                'Barang hanya dapat dikembalikan ketika status sedang dipinjam.',
                                422
                            );
                        }

                        $lockedRequest
                            ->load([
                                'items.product',
                            ]);

                        if (
                            $lockedRequest
                                ->items
                                ->isEmpty()
                        ) {
                            $this->abortJson(
                                'Pengajuan tidak memiliki item barang.',
                                422
                            );
                        }

                        /*
                         * Karena barang dikembalikan,
                         * stok ditambahkan kembali.
                         */
                        foreach (
                            $lockedRequest
                                ->items as
                            $item
                        ) {
                            $product =
                                Product::query()
                                    ->lockForUpdate()
                                    ->find(
                                        $item
                                            ->product_id
                                    );

                            if (
                                !$product
                            ) {
                                $this->abortJson(
                                    'Salah satu barang pada pengajuan tidak ditemukan.',
                                    422
                                );
                            }

                            $product->increment(
                                'stock',
                                (int)
                                    $item
                                        ->quantity
                            );
                        }

                        $lockedRequest
                            ->update([
                                'status' =>
                                    'returned',

                                'return_evidence_path' =>
                                    $evidencePath,

                                'return_evidence_name' =>
                                    $evidenceFile
                                        ->getClientOriginalName(),

                                'return_evidence_mime' =>
                                    $evidenceFile
                                        ->getMimeType(),

                                'returned_at' =>
                                    now(),

                                'completed_at' =>
                                    now(),
                            ]);

                        return $lockedRequest
                            ->fresh([
                                'user',
                                'items.product.category',
                            ]);
                    }
                );

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Barang berhasil dikembalikan. Peminjaman telah selesai dan user dapat membuat peminjaman baru.',

                'data' =>
                    $borrowRequest,
            ]);
        } catch (
            HttpResponseException $error
        ) {
            $this->deleteFileIfExists(
                $evidencePath
            );

            throw $error;
        } catch (
            Throwable $error
        ) {
            $this->deleteFileIfExists(
                $evidencePath
            );

            report(
                $error
            );

            return response()->json([
                'success' =>
                    false,

                'message' =>
                    app()->isLocal()
                        ? $error->getMessage()
                        : 'Proses pengembalian barang gagal dilakukan.',

                'data' =>
                    null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | COMPLETE ASSET REQUEST
    |--------------------------------------------------------------------------
    |
    | KHUSUS:
    |
    | request_type = asset_request
    |
    | Flow:
    |
    | pending
    |   ↓
    | approved
    |   ↓
    | completed
    |
    | Pada completed:
    |
    | - Evidence penyerahan wajib.
    | - Stok dikurangi PERMANEN.
    | - Tidak ada proses return.
    |
    */

    public function complete(
        Request $request,
        int $id
    ): JsonResponse {
        if (
            !$this->canProcessBorrowRequest(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin menyelesaikan Request Barang.'
            );
        }

        $validated =
            $request->validate([
                'handover_evidence' => [
                    'required',
                    'file',
                    'mimes:pdf,jpg,jpeg,png',
                    'max:10240',
                ],
            ], [
                'handover_evidence.required' =>
                    'Bukti penyerahan barang wajib diunggah.',

                'handover_evidence.file' =>
                    'Bukti penyerahan barang tidak valid.',

                'handover_evidence.mimes' =>
                    'Bukti penyerahan harus berformat PDF, JPG, JPEG, atau PNG.',

                'handover_evidence.max' =>
                    'Ukuran bukti penyerahan maksimal 10 MB.',
            ]);

        $evidencePath =
            null;

        try {
            $evidenceFile =
                $request->file(
                    'handover_evidence'
                );

            $evidencePath =
                $evidenceFile->store(
                    'sekpim-asset-request-evidence',
                    'public'
                );

            $borrowRequest =
                DB::transaction(
                    function () use (
                        $id,
                        $evidenceFile,
                        $evidencePath
                    ): BorrowRequest {
                        $lockedRequest =
                            BorrowRequest::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $id
                                );

                        if (
                            $lockedRequest
                                ->request_type !==
                            self::TYPE_ASSET_REQUEST
                        ) {
                            $this->abortJson(
                                'Endpoint ini hanya dapat digunakan untuk Request Barang.',
                                422
                            );
                        }

                        if (
                            $lockedRequest
                                ->status !==
                            'approved'
                        ) {
                            $this->abortJson(
                                'Request Barang hanya dapat diselesaikan setelah disetujui.',
                                422
                            );
                        }

                        $lockedRequest
                            ->load([
                                'items.product',
                            ]);

                        if (
                            $lockedRequest
                                ->items
                                ->isEmpty()
                        ) {
                            $this->abortJson(
                                'Request Barang tidak memiliki item.',
                                422
                            );
                        }

                        /*
                         * Lock dan validasi stok seluruh produk.
                         */
                        foreach (
                            $lockedRequest
                                ->items as
                            $item
                        ) {
                            $product =
                                Product::query()
                                    ->lockForUpdate()
                                    ->find(
                                        $item
                                            ->product_id
                                    );

                            if (
                                !$product
                            ) {
                                $this->abortJson(
                                    'Salah satu barang tidak ditemukan.',
                                    422
                                );
                            }

                            $this->validateProductForRequest(
                                $product,
                                self::TYPE_ASSET_REQUEST,
                                (int)
                                    $item
                                        ->quantity
                            );
                        }

                        /*
                         * Request Barang:
                         * stok dikurangi permanen.
                         */
                        foreach (
                            $lockedRequest
                                ->items as
                            $item
                        ) {
                            $product =
                                Product::query()
                                    ->lockForUpdate()
                                    ->findOrFail(
                                        $item
                                            ->product_id
                                    );

                            $product->decrement(
                                'stock',
                                (int)
                                    $item
                                        ->quantity
                            );
                        }

                        $lockedRequest
                            ->update([
                                'status' =>
                                    'completed',

                                /*
                                 * Kita reuse handover_evidence_* sebagai
                                 * bukti penyerahan Request Barang.
                                 */
                                'handover_evidence_path' =>
                                    $evidencePath,

                                'handover_evidence_name' =>
                                    $evidenceFile
                                        ->getClientOriginalName(),

                                'handover_evidence_mime' =>
                                    $evidenceFile
                                        ->getMimeType(),

                                'completed_at' =>
                                    now(),

                                'borrowed_at' =>
                                    null,

                                'returned_at' =>
                                    null,
                            ]);

                        return $lockedRequest
                            ->fresh([
                                'user',
                                'items.product.category',
                            ]);
                    }
                );

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Request Barang selesai. Barang telah diserahkan kepada pemohon dan stok berhasil diperbarui.',

                'data' =>
                    $borrowRequest,
            ]);
        } catch (
            HttpResponseException $error
        ) {
            $this->deleteFileIfExists(
                $evidencePath
            );

            throw $error;
        } catch (
            Throwable $error
        ) {
            $this->deleteFileIfExists(
                $evidencePath
            );

            report(
                $error
            );

            return response()->json([
                'success' =>
                    false,

                'message' =>
                    app()->isLocal()
                        ? $error->getMessage()
                        : 'Request Barang gagal diselesaikan.',

                'data' =>
                    null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | ACTIVE BORROW CHECK
    |--------------------------------------------------------------------------
    |
    | Hanya untuk Peminjaman Barang.
    |
    | User tidak dapat membuat peminjaman baru jika masih mempunyai:
    |
    | pending
    | approved
    | borrowed
    |
    */

    private function ensureNoActiveBorrow(
        User $user
    ): void {
        $activeBorrow =
            BorrowRequest::query()
                ->where(
                    'user_id',
                    $user->id
                )
                ->where(
                    function (
                        $query
                    ): void {
                        /*
                         * request_type = borrow
                         */
                        $query->where(
                            'request_type',
                            self::TYPE_BORROW
                        )

                        /*
                         * Dukungan data lama.
                         *
                         * Jika request_type NULL,
                         * dianggap sebagai Peminjaman Barang.
                         */
                        ->orWhereNull(
                            'request_type'
                        );
                    }
                )
                ->whereIn(
                    'status',
                    self::ACTIVE_BORROW_STATUSES
                )
                ->latest(
                    'submitted_at'
                )
                ->first();

        if (
            !$activeBorrow
        ) {
            return;
        }

        $statusLabel =
            match (
                $activeBorrow->status
            ) {
                'pending' =>
                    'masih menunggu persetujuan',

                'approved' =>
                    'sudah disetujui dan menunggu pengambilan',

                'borrowed' =>
                    'masih sedang dipinjam',

                default =>
                    $activeBorrow->status,
            };

        $code =
            $activeBorrow
                ->borrow_code
            ?: 'BRW-' .
                $activeBorrow
                    ->id;

        $this->abortJson(
            "Kamu masih memiliki Peminjaman Barang aktif ({$code}) yang {$statusLabel}. Selesaikan peminjaman tersebut terlebih dahulu sebelum membuat Peminjaman Barang baru.",
            422
        );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE REQUEST ITEMS
    |--------------------------------------------------------------------------
    */

    private function validateRequestItems(
        array $items,
        string $requestType
    ): void {
        foreach (
            $items as
            $item
        ) {
            $product =
                Product::query()
                    ->find(
                        $item[
                            'product_id'
                        ]
                    );

            if (
                !$product
            ) {
                $this->abortJson(
                    'Salah satu barang tidak ditemukan.',
                    422
                );
            }

            $this->validateProductForRequest(
                $product,
                $requestType,
                (int)
                    $item[
                        'quantity'
                    ]
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE PRODUCT FOR REQUEST
    |--------------------------------------------------------------------------
    */

    private function validateProductForRequest(
        Product $product,
        string $requestType,
        int $quantity
    ): void {
        if (
            $product->status !==
            'active'
        ) {
            $this->abortJson(
                "Barang {$product->name} sedang tidak aktif.",
                422
            );
        }

        /*
         * Legacy fallback.
         *
         * Produk lama type borrow/both yang sekpim_item_type
         * belum terisi tetap dianggap barang pinjaman.
         */
        $sekpimItemType =
            $product
                ->sekpim_item_type;

        if (
            !$sekpimItemType &&
            in_array(
                $product->type,
                [
                    'borrow',
                    'both',
                ],
                true
            )
        ) {
            $sekpimItemType =
                self::TYPE_BORROW;
        }

        if (
            $requestType ===
            self::TYPE_BORROW
        ) {
            $allowed =
                in_array(
                    $sekpimItemType,
                    [
                        Product::SEKPIM_TYPE_BORROW,
                        Product::SEKPIM_TYPE_BOTH,
                    ],
                    true
                );

            if (
                !$allowed
            ) {
                $this->abortJson(
                    "Barang {$product->name} tidak tersedia untuk Peminjaman Barang.",
                    422
                );
            }
        }

        if (
            $requestType ===
            self::TYPE_ASSET_REQUEST
        ) {
            $allowed =
                in_array(
                    $sekpimItemType,
                    [
                        Product::SEKPIM_TYPE_ASSET_REQUEST,
                        Product::SEKPIM_TYPE_BOTH,
                    ],
                    true
                );

            if (
                !$allowed
            ) {
                $this->abortJson(
                    "Barang {$product->name} tidak tersedia untuk Request Barang.",
                    422
                );
            }
        }

        if (
            (int)
                $product->stock <
            $quantity
        ) {
            $this->abortJson(
                "Stok {$product->name} tidak mencukupi. Stok tersedia {$product->stock}, sedangkan jumlah yang diajukan {$quantity}.",
                422
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | ACCESS
    |--------------------------------------------------------------------------
    */

    private function canAccessBorrowRequest(
        Request $request,
        BorrowRequest $borrowRequest
    ): bool {
        $user =
            $request->user();

        if (
            !$user
        ) {
            return false;
        }

        if (
            $this->userHasPermission(
                $user,
                'approval.borrowing.view'
            )
        ) {
            return true;
        }

        if (
            !$this->userHasPermission(
                $user,
                'request.history.view'
            )
        ) {
            return false;
        }

        return (
            (int)
                $borrowRequest
                    ->user_id ===
            (int)
                $user->id
        );
    }

    private function canProcessBorrowRequest(
        Request $request
    ): bool {
        $user =
            $request->user();

        return (
            $user !==
                null &&
            $this->userHasPermission(
                $user,
                'approval.borrowing.process'
            )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | PERMISSIONS
    |--------------------------------------------------------------------------
    */

    private function userHasPermission(
        User $user,
        string $permission
    ): bool {
        if (
            $user->role ===
            'superadmin'
        ) {
            return true;
        }

        if (
            method_exists(
                $user,
                'hasPermission'
            )
        ) {
            return (bool)
                $user
                    ->hasPermission(
                        $permission
                    );
        }

        if (
            method_exists(
                $user,
                'hasPermissionTo'
            )
        ) {
            return (bool)
                $user
                    ->hasPermissionTo(
                        $permission
                    );
        }

        $permissions =
            $user->permissions
                ?? [];

        if (
            is_string(
                $permissions
            )
        ) {
            $decoded =
                json_decode(
                    $permissions,
                    true
                );

            if (
                json_last_error() ===
                    JSON_ERROR_NONE &&
                is_array(
                    $decoded
                )
            ) {
                $permissions =
                    $decoded;
            } else {
                $permissions =
                    preg_split(
                        '/[,;|]/',
                        $permissions
                    ) ?: [];
            }
        }

        if (
            !is_array(
                $permissions
            )
        ) {
            return false;
        }

        return in_array(
            $permission,
            $permissions,
            true
        );
    }

    /*
    |--------------------------------------------------------------------------
    | REQUEST CODE
    |--------------------------------------------------------------------------
    */

    private function generateRequestCode(
        string $requestType
    ): string {
        $prefix =
            $requestType ===
            self::TYPE_ASSET_REQUEST
                ? 'REQ'
                : 'BRW';

        do {
            $code =
                sprintf(
                    '%s-%s-%s',
                    $prefix,
                    now()->format(
                        'YmdHis'
                    ),
                    strtoupper(
                        Str::random(
                            5
                        )
                    )
                );
        } while (
            BorrowRequest::query()
                ->where(
                    'borrow_code',
                    $code
                )
                ->exists()
        );

        return $code;
    }

    /*
    |--------------------------------------------------------------------------
    | FILE HELPER
    |--------------------------------------------------------------------------
    */

    private function deleteFileIfExists(
        ?string $filePath
    ): void {
        if (
            !$filePath
        ) {
            return;
        }

        if (
            Storage::disk(
                'public'
            )->exists(
                $filePath
            )
        ) {
            Storage::disk(
                'public'
            )->delete(
                $filePath
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | RESPONSE HELPERS
    |--------------------------------------------------------------------------
    */

    private function forbiddenResponse(
        string $message
    ): JsonResponse {
        return response()->json([
            'success' =>
                false,

            'message' =>
                $message,

            'data' =>
                null,
        ], 403);
    }

    private function abortJson(
        string $message,
        int $statusCode
    ): never {
        throw new HttpResponseException(
            response()->json([
                'success' =>
                    false,

                'message' =>
                    $message,

                'data' =>
                    null,
            ], $statusCode)
        );
    }
}