<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BorrowRequest;
use App\Models\BorrowRequestItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class BorrowRequestController extends Controller
{
    /**
     * Menampilkan seluruh pengajuan peminjaman.
     *
     * Endpoint ini hanya dapat diakses oleh akun yang memiliki
     * permission approval.borrowing.view.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'approval.borrowing.view'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin melihat seluruh pengajuan peminjaman.'
            );
        }

        $borrowRequests = BorrowRequest::query()
            ->with([
                'user',
                'items.product.category',
            ])
            ->latest('submitted_at')
            ->latest('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data pengajuan peminjaman berhasil diambil.',
            'data' => $borrowRequests,
        ]);
    }

    /**
     * Menampilkan riwayat peminjaman milik user yang sedang login.
     */
    public function myBorrowRequests(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'request.history.view'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin melihat riwayat pengajuan peminjaman.'
            );
        }

        $borrowRequests = BorrowRequest::query()
            ->with([
                'user',
                'items.product.category',
            ])
            ->where(
                'user_id',
                $user->id
            )
            ->latest('submitted_at')
            ->latest('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat pengajuan peminjaman berhasil diambil.',
            'data' => $borrowRequests,
        ]);
    }

    /**
     * Menampilkan detail pengajuan peminjaman.
     *
     * Aturan akses:
     * - superadmin dapat melihat seluruh pengajuan;
     * - approval.borrowing.view dapat melihat seluruh pengajuan;
     * - request.history.view hanya dapat melihat pengajuan miliknya;
     * - akun lain mendapatkan response 403.
     */
    public function show(
        Request $request,
        int $id
    ): JsonResponse {
        $borrowRequest = BorrowRequest::query()
            ->with([
                'user',
                'items.product.category',
            ])
            ->findOrFail($id);

        if (
            !$this->canAccessBorrowRequest(
                $request,
                $borrowRequest
            )
        ) {
            return $this->forbiddenResponse(
                'Akses ditolak. Kamu tidak memiliki izin melihat pengajuan peminjaman ini.'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail pengajuan peminjaman berhasil diambil.',
            'data' => $borrowRequest,
        ]);
    }

    /**
     * Menyimpan pengajuan peminjaman baru.
     *
     * Stok belum dikurangi ketika user mengirim pengajuan.
     * Stok baru dikurangi ketika barang benar-benar diserahkan.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'request.borrowing.create'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin membuat pengajuan peminjaman.'
            );
        }

        $validated = $request->validate([
            'purpose' => [
                'required',
                'string',
                'min:5',
                'max:3000',
            ],

            'borrow_date' => [
                'required',
                'date',
            ],

            'return_date' => [
                'required',
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
            'purpose.required' => 'Tujuan peminjaman wajib diisi.',
            'purpose.min' => 'Tujuan peminjaman minimal lima karakter.',
            'purpose.max' => 'Tujuan peminjaman maksimal 3.000 karakter.',

            'borrow_date.required' => 'Tanggal pengambilan wajib diisi.',
            'borrow_date.date' => 'Format tanggal pengambilan tidak valid.',

            'return_date.required' => 'Tanggal pengembalian wajib diisi.',
            'return_date.date' => 'Format tanggal pengembalian tidak valid.',
            'return_date.after_or_equal' => 'Tanggal pengembalian tidak boleh sebelum tanggal pengambilan.',

            'items.required' => 'Pilih minimal satu perlengkapan.',
            'items.array' => 'Format daftar perlengkapan tidak valid.',
            'items.min' => 'Pilih minimal satu perlengkapan.',

            'items.*.product_id.required' => 'Perlengkapan wajib dipilih.',
            'items.*.product_id.distinct' => 'Perlengkapan yang sama tidak boleh dipilih lebih dari satu kali.',
            'items.*.product_id.exists' => 'Perlengkapan tidak ditemukan.',

            'items.*.quantity.required' => 'Jumlah perlengkapan wajib diisi.',
            'items.*.quantity.integer' => 'Jumlah perlengkapan harus berupa angka.',
            'items.*.quantity.min' => 'Jumlah perlengkapan minimal satu.',
        ]);

        try {
            $borrowRequest = DB::transaction(
                function () use (
                    $user,
                    $validated
                ): BorrowRequest {
                    $this->validateBorrowItems(
                        $validated['items']
                    );

                    $borrowRequest = BorrowRequest::query()->create([
                        'user_id' => $user->id,
                        'borrow_code' => $this->generateBorrowCode(),

                        'purpose' => trim(
                            $validated['purpose']
                        ),

                        'borrow_date' => $validated['borrow_date'],
                        'return_date' => $validated['return_date'],

                        'status' => 'pending',
                        'admin_note' => null,

                        'submitted_at' => now(),
                        'approved_at' => null,
                        'rejected_at' => null,
                        'borrowed_at' => null,
                        'returned_at' => null,
                    ]);

                    foreach (
                        $validated['items']
                        as $item
                    ) {
                        BorrowRequestItem::query()->create([
                            'borrow_request_id' => $borrowRequest->id,
                            'product_id' => $item['product_id'],
                            'quantity' => $item['quantity'],
                        ]);
                    }

                    return $borrowRequest->load([
                        'user',
                        'items.product.category',
                    ]);
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan peminjaman berhasil dikirim.',
                'data' => $borrowRequest,
            ], 201);
        } catch (HttpResponseException $error) {
            throw $error;
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Pengajuan peminjaman gagal dikirim. Silakan periksa kembali data pengajuan.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Menyetujui pengajuan peminjaman.
     *
     * Approval belum mengurangi stok.
     * Stok baru dikurangi ketika barang diserahkan.
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
                'Kamu tidak memiliki izin menyetujui pengajuan peminjaman.'
            );
        }

        try {
            $borrowRequest = DB::transaction(
                function () use ($id): BorrowRequest {
                    $lockedBorrowRequest = BorrowRequest::query()
                        ->lockForUpdate()
                        ->findOrFail($id);

                    if (
                        $lockedBorrowRequest->status !==
                        'pending'
                    ) {
                        $this->abortJson(
                            'Pengajuan hanya bisa disetujui saat status masih menunggu.',
                            422
                        );
                    }

                    $lockedBorrowRequest->load([
                        'items.product',
                    ]);

                    if (
                        $lockedBorrowRequest->items->isEmpty()
                    ) {
                        $this->abortJson(
                            'Pengajuan tidak memiliki item perlengkapan.',
                            422
                        );
                    }

                    foreach (
                        $lockedBorrowRequest->items
                        as $item
                    ) {
                        if (!$item->product_id) {
                            $this->abortJson(
                                'Salah satu perlengkapan pada pengajuan sudah tidak tersedia.',
                                422
                            );
                        }

                        $product = Product::query()
                            ->find(
                                $item->product_id
                            );

                        if (!$product) {
                            $this->abortJson(
                                'Salah satu perlengkapan pada pengajuan tidak ditemukan.',
                                422
                            );
                        }

                        if (
                            $product->status !==
                            'active'
                        ) {
                            $this->abortJson(
                                "Perlengkapan {$product->name} sedang tidak aktif.",
                                422
                            );
                        }

                        if (
                            !in_array(
                                $product->type,
                                [
                                    'borrow',
                                    'both',
                                ],
                                true
                            )
                        ) {
                            $this->abortJson(
                                "Produk {$product->name} tidak tersedia untuk peminjaman.",
                                422
                            );
                        }

                        if (
                            (int) $product->stock <
                            (int) $item->quantity
                        ) {
                            $this->abortJson(
                                "Stok {$product->name} tidak mencukupi. Stok tersedia {$product->stock}, sedangkan jumlah yang diajukan {$item->quantity}.",
                                422
                            );
                        }
                    }

                    $lockedBorrowRequest->update([
                        'status' => 'approved',
                        'admin_note' => null,

                        'approved_at' => now(),
                        'rejected_at' => null,
                        'borrowed_at' => null,
                        'returned_at' => null,
                    ]);

                    return $lockedBorrowRequest->fresh([
                        'user',
                        'items.product.category',
                    ]);
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan peminjaman berhasil disetujui.',
                'data' => $borrowRequest,
            ]);
        } catch (HttpResponseException $error) {
            throw $error;
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Approval peminjaman gagal diproses.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Menolak pengajuan peminjaman.
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
                'Kamu tidak memiliki izin menolak pengajuan peminjaman.'
            );
        }

        $validated = $request->validate([
            'admin_note' => [
                'required',
                'string',
                'min:5',
                'max:2000',
            ],
        ], [
            'admin_note.required' => 'Alasan penolakan wajib diisi.',
            'admin_note.min' => 'Alasan penolakan minimal lima karakter.',
            'admin_note.max' => 'Alasan penolakan maksimal 2.000 karakter.',
        ]);

        try {
            $borrowRequest = DB::transaction(
                function () use (
                    $id,
                    $validated
                ): BorrowRequest {
                    $lockedBorrowRequest = BorrowRequest::query()
                        ->lockForUpdate()
                        ->findOrFail($id);

                    if (
                        $lockedBorrowRequest->status !==
                        'pending'
                    ) {
                        $this->abortJson(
                            'Pengajuan hanya bisa ditolak saat status masih menunggu.',
                            422
                        );
                    }

                    $lockedBorrowRequest->update([
                        'status' => 'rejected',

                        'admin_note' => trim(
                            $validated['admin_note']
                        ),

                        'rejected_at' => now(),
                        'approved_at' => null,
                        'borrowed_at' => null,
                        'returned_at' => null,
                    ]);

                    return $lockedBorrowRequest->fresh([
                        'user',
                        'items.product.category',
                    ]);
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan peminjaman berhasil ditolak.',
                'data' => $borrowRequest,
            ]);
        } catch (HttpResponseException $error) {
            throw $error;
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Penolakan pengajuan peminjaman gagal diproses.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Menandai barang telah diserahkan kepada pemohon.
     *
     * Stok dikurangi tepat satu kali ketika status berubah
     * dari approved menjadi borrowed.
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

        try {
            $borrowRequest = DB::transaction(
                function () use ($id): BorrowRequest {
                    $lockedBorrowRequest = BorrowRequest::query()
                        ->lockForUpdate()
                        ->findOrFail($id);

                    if (
                        $lockedBorrowRequest->status !==
                        'approved'
                    ) {
                        $this->abortJson(
                            'Barang hanya bisa diserahkan setelah pengajuan disetujui.',
                            422
                        );
                    }

                    $lockedBorrowRequest->load([
                        'items.product',
                    ]);

                    if (
                        $lockedBorrowRequest->items->isEmpty()
                    ) {
                        $this->abortJson(
                            'Pengajuan tidak memiliki item perlengkapan.',
                            422
                        );
                    }

                    foreach (
                        $lockedBorrowRequest->items
                        as $item
                    ) {
                        if (!$item->product_id) {
                            $this->abortJson(
                                'Salah satu perlengkapan pada pengajuan sudah tidak tersedia.',
                                422
                            );
                        }

                        $product = Product::query()
                            ->lockForUpdate()
                            ->find(
                                $item->product_id
                            );

                        if (!$product) {
                            $this->abortJson(
                                'Salah satu perlengkapan pada pengajuan tidak ditemukan.',
                                422
                            );
                        }

                        if (
                            $product->status !==
                            'active'
                        ) {
                            $this->abortJson(
                                "Perlengkapan {$product->name} sedang tidak aktif.",
                                422
                            );
                        }

                        if (
                            !in_array(
                                $product->type,
                                [
                                    'borrow',
                                    'both',
                                ],
                                true
                            )
                        ) {
                            $this->abortJson(
                                "Produk {$product->name} tidak tersedia untuk peminjaman.",
                                422
                            );
                        }

                        if (
                            (int) $product->stock <
                            (int) $item->quantity
                        ) {
                            $this->abortJson(
                                "Stok {$product->name} tidak mencukupi. Stok tersedia {$product->stock}, sedangkan jumlah yang akan diserahkan {$item->quantity}.",
                                422
                            );
                        }

                        $product->decrement(
                            'stock',
                            (int) $item->quantity
                        );
                    }

                    $lockedBorrowRequest->update([
                        'status' => 'borrowed',
                        'borrowed_at' => now(),
                        'returned_at' => null,
                    ]);

                    return $lockedBorrowRequest->fresh([
                        'user',
                        'items.product.category',
                    ]);
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Barang berhasil ditandai telah diserahkan kepada pemohon.',
                'data' => $borrowRequest,
            ]);
        } catch (HttpResponseException $error) {
            throw $error;
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Proses penyerahan barang gagal dilakukan.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Menandai barang telah dikembalikan.
     *
     * Stok dikembalikan tepat satu kali ketika status berubah
     * dari borrowed menjadi returned.
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

        try {
            $borrowRequest = DB::transaction(
                function () use ($id): BorrowRequest {
                    $lockedBorrowRequest = BorrowRequest::query()
                        ->lockForUpdate()
                        ->findOrFail($id);

                    if (
                        $lockedBorrowRequest->status !==
                        'borrowed'
                    ) {
                        $this->abortJson(
                            'Barang hanya bisa dikembalikan saat status sedang dipinjam.',
                            422
                        );
                    }

                    $lockedBorrowRequest->load([
                        'items.product',
                    ]);

                    if (
                        $lockedBorrowRequest->items->isEmpty()
                    ) {
                        $this->abortJson(
                            'Pengajuan tidak memiliki item perlengkapan.',
                            422
                        );
                    }

                    foreach (
                        $lockedBorrowRequest->items
                        as $item
                    ) {
                        if (!$item->product_id) {
                            $this->abortJson(
                                'Salah satu perlengkapan pada pengajuan sudah tidak tersedia.',
                                422
                            );
                        }

                        $product = Product::query()
                            ->lockForUpdate()
                            ->find(
                                $item->product_id
                            );

                        if (!$product) {
                            $this->abortJson(
                                'Salah satu perlengkapan pada pengajuan tidak ditemukan.',
                                422
                            );
                        }

                        $product->increment(
                            'stock',
                            (int) $item->quantity
                        );
                    }

                    $lockedBorrowRequest->update([
                        'status' => 'returned',
                        'returned_at' => now(),
                    ]);

                    return $lockedBorrowRequest->fresh([
                        'user',
                        'items.product.category',
                    ]);
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Barang berhasil ditandai telah dikembalikan.',
                'data' => $borrowRequest,
            ]);
        } catch (HttpResponseException $error) {
            throw $error;
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Proses pengembalian barang gagal dilakukan.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Memeriksa akses detail peminjaman.
     */
    private function canAccessBorrowRequest(
        Request $request,
        BorrowRequest $borrowRequest
    ): bool {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        /*
         * Superadmin atau pemilik permission approval
         * dapat melihat seluruh pengajuan peminjaman.
         */
        if (
            $this->userHasPermission(
                $user,
                'approval.borrowing.view'
            )
        ) {
            return true;
        }

        /*
         * Pengguna yang hanya memiliki akses riwayat
         * hanya boleh melihat pengajuannya sendiri.
         */
        if (
            !$this->userHasPermission(
                $user,
                'request.history.view'
            )
        ) {
            return false;
        }

        return (
            (int) $borrowRequest->user_id ===
            (int) $user->id
        );
    }

    /**
     * Memeriksa permission proses approval peminjaman.
     */
    private function canProcessBorrowRequest(
        Request $request
    ): bool {
        $user = $request->user();

        return (
            $user !== null &&
            $this->userHasPermission(
                $user,
                'approval.borrowing.process'
            )
        );
    }

    /**
     * Memeriksa permission user.
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
            return $user->hasPermission(
                $permission
            );
        }

        $permissions =
            is_array($user->permissions)
                ? $user->permissions
                : [];

        return in_array(
            $permission,
            $permissions,
            true
        );
    }

    /**
     * Memvalidasi perlengkapan ketika user membuat pengajuan.
     *
     * Stok diperiksa lagi saat barang diserahkan karena stok
     * dapat berubah setelah pengajuan dibuat.
     */
    private function validateBorrowItems(
        array $items
    ): void {
        foreach ($items as $item) {
            $product = Product::query()
                ->find(
                    $item['product_id']
                );

            if (!$product) {
                $this->abortJson(
                    'Salah satu perlengkapan tidak ditemukan.',
                    422
                );
            }

            if (
                $product->status !==
                'active'
            ) {
                $this->abortJson(
                    "Perlengkapan {$product->name} sedang tidak aktif.",
                    422
                );
            }

            if (
                !in_array(
                    $product->type,
                    [
                        'borrow',
                        'both',
                    ],
                    true
                )
            ) {
                $this->abortJson(
                    "Produk {$product->name} tidak tersedia untuk peminjaman.",
                    422
                );
            }

            if (
                (int) $product->stock <
                (int) $item['quantity']
            ) {
                $this->abortJson(
                    "Stok {$product->name} tidak mencukupi. Stok tersedia {$product->stock}.",
                    422
                );
            }
        }
    }

    /**
     * Membuat kode pengajuan peminjaman yang unik.
     */
    private function generateBorrowCode(): string
    {
        do {
            $borrowCode = sprintf(
                'BRW-%s-%s',
                now()->format(
                    'YmdHis'
                ),
                strtoupper(
                    Str::random(5)
                )
            );
        } while (
            BorrowRequest::query()
                ->where(
                    'borrow_code',
                    $borrowCode
                )
                ->exists()
        );

        return $borrowCode;
    }

    /**
     * Response akses ditolak.
     */
    private function forbiddenResponse(
        string $message
    ): JsonResponse {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
        ], 403);
    }

    /**
     * Menghentikan proses dengan response JSON konsisten.
     */
    private function abortJson(
        string $message,
        int $statusCode
    ): never {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => $message,
                'data' => null,
            ], $statusCode)
        );
    }
}