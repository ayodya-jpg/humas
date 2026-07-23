<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BorrowRequest;
use App\Models\BorrowRequestItem;
use App\Models\Product;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class BorrowRequestController extends Controller
{
    /**
     * Menampilkan seluruh pengajuan peminjaman untuk admin SEKPiM.
     */
    public function index(): JsonResponse
    {
        $borrowRequests = BorrowRequest::with([
            'user',
            'items.product.category',
        ])
            ->latest()
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
    public function myBorrowRequests(Request $request): JsonResponse
    {
        $borrowRequests = BorrowRequest::with([
            'items.product.category',
        ])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat pengajuan peminjaman berhasil diambil.',
            'data' => $borrowRequests,
        ]);
    }

    /**
     * Menampilkan detail pengajuan peminjaman.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $borrowRequest = BorrowRequest::with([
            'user',
            'items.product.category',
        ])->findOrFail($id);

        if (!$this->canAccessBorrowRequest($request, $borrowRequest)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Kamu tidak memiliki izin melihat pengajuan peminjaman ini.',
                'data' => null,
            ], 403);
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
     * Stok baru dikurangi saat barang benar-benar diserahkan.
     */
    public function store(Request $request): JsonResponse
    {
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
            $borrowRequest = DB::transaction(function () use ($request, $validated) {
                /*
                 * Memastikan produk aktif, bertipe peminjaman,
                 * dan stok tersedia ketika pengajuan dibuat.
                 *
                 * Stok akan diperiksa kembali ketika barang diserahkan.
                 */
                $this->validateBorrowItems($validated['items']);

                $borrowRequest = BorrowRequest::create([
                    'user_id' => $request->user()->id,
                    'borrow_code' => $this->generateBorrowCode(),

                    'purpose' => $validated['purpose'],
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

                foreach ($validated['items'] as $item) {
                    BorrowRequestItem::create([
                        'borrow_request_id' => $borrowRequest->id,
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                    ]);
                }

                return $borrowRequest->load([
                    'user',
                    'items.product.category',
                ]);
            });

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
    public function approve(int $id): JsonResponse
    {
        try {
            $borrowRequest = DB::transaction(function () use ($id) {
                $lockedBorrowRequest = BorrowRequest::query()
                    ->lockForUpdate()
                    ->findOrFail($id);

                if ($lockedBorrowRequest->status !== 'pending') {
                    $this->abortJson(
                        'Pengajuan hanya bisa disetujui saat status masih menunggu.',
                        422
                    );
                }

                $lockedBorrowRequest->load([
                    'items.product',
                ]);

                if ($lockedBorrowRequest->items->isEmpty()) {
                    $this->abortJson(
                        'Pengajuan tidak memiliki item perlengkapan.',
                        422
                    );
                }

                /*
                 * Approval tetap memeriksa produk dan stok saat ini.
                 * Pemeriksaan final dilakukan lagi saat barang diserahkan.
                 */
                foreach ($lockedBorrowRequest->items as $item) {
                    if (!$item->product_id) {
                        $this->abortJson(
                            'Salah satu perlengkapan pada pengajuan sudah tidak tersedia.',
                            422
                        );
                    }

                    $product = Product::query()
                        ->find($item->product_id);

                    if (!$product) {
                        $this->abortJson(
                            'Salah satu perlengkapan pada pengajuan tidak ditemukan.',
                            422
                        );
                    }

                    if ($product->status !== 'active') {
                        $this->abortJson(
                            "Perlengkapan {$product->name} sedang tidak aktif.",
                            422
                        );
                    }

                    if (!in_array($product->type, ['borrow', 'both'], true)) {
                        $this->abortJson(
                            "Produk {$product->name} tidak tersedia untuk peminjaman.",
                            422
                        );
                    }

                    if ((int) $product->stock < (int) $item->quantity) {
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
            });

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
     *
     * Penolakan hanya dapat dilakukan saat status pending.
     */
    public function reject(Request $request, int $id): JsonResponse
    {
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
            $borrowRequest = DB::transaction(function () use ($id, $validated) {
                $lockedBorrowRequest = BorrowRequest::query()
                    ->lockForUpdate()
                    ->findOrFail($id);

                if ($lockedBorrowRequest->status !== 'pending') {
                    $this->abortJson(
                        'Pengajuan hanya bisa ditolak saat status masih menunggu.',
                        422
                    );
                }

                $lockedBorrowRequest->update([
                    'status' => 'rejected',
                    'admin_note' => $validated['admin_note'],

                    'rejected_at' => now(),
                    'approved_at' => null,
                    'borrowed_at' => null,
                    'returned_at' => null,
                ]);

                return $lockedBorrowRequest->fresh([
                    'user',
                    'items.product.category',
                ]);
            });

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
    public function borrowed(int $id): JsonResponse
    {
        try {
            $borrowRequest = DB::transaction(function () use ($id) {
                $lockedBorrowRequest = BorrowRequest::query()
                    ->lockForUpdate()
                    ->findOrFail($id);

                if ($lockedBorrowRequest->status !== 'approved') {
                    $this->abortJson(
                        'Barang hanya bisa diserahkan setelah pengajuan disetujui.',
                        422
                    );
                }

                $lockedBorrowRequest->load([
                    'items.product',
                ]);

                if ($lockedBorrowRequest->items->isEmpty()) {
                    $this->abortJson(
                        'Pengajuan tidak memiliki item perlengkapan.',
                        422
                    );
                }

                foreach ($lockedBorrowRequest->items as $item) {
                    if (!$item->product_id) {
                        $this->abortJson(
                            'Salah satu perlengkapan pada pengajuan sudah tidak tersedia.',
                            422
                        );
                    }

                    /*
                     * Mengunci produk agar dua proses penyerahan barang
                     * tidak memotong stok pada waktu yang sama.
                     */
                    $product = Product::query()
                        ->lockForUpdate()
                        ->find($item->product_id);

                    if (!$product) {
                        $this->abortJson(
                            'Salah satu perlengkapan pada pengajuan tidak ditemukan.',
                            422
                        );
                    }

                    if ($product->status !== 'active') {
                        $this->abortJson(
                            "Perlengkapan {$product->name} sedang tidak aktif.",
                            422
                        );
                    }

                    if (!in_array($product->type, ['borrow', 'both'], true)) {
                        $this->abortJson(
                            "Produk {$product->name} tidak tersedia untuk peminjaman.",
                            422
                        );
                    }

                    if ((int) $product->stock < (int) $item->quantity) {
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
            });

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
    public function returned(int $id): JsonResponse
    {
        try {
            $borrowRequest = DB::transaction(function () use ($id) {
                $lockedBorrowRequest = BorrowRequest::query()
                    ->lockForUpdate()
                    ->findOrFail($id);

                if ($lockedBorrowRequest->status !== 'borrowed') {
                    $this->abortJson(
                        'Barang hanya bisa dikembalikan saat status sedang dipinjam.',
                        422
                    );
                }

                $lockedBorrowRequest->load([
                    'items.product',
                ]);

                if ($lockedBorrowRequest->items->isEmpty()) {
                    $this->abortJson(
                        'Pengajuan tidak memiliki item perlengkapan.',
                        422
                    );
                }

                foreach ($lockedBorrowRequest->items as $item) {
                    if (!$item->product_id) {
                        $this->abortJson(
                            'Salah satu perlengkapan pada pengajuan sudah tidak tersedia.',
                            422
                        );
                    }

                    $product = Product::query()
                        ->lockForUpdate()
                        ->find($item->product_id);

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
            });

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
         * Admin Humas tidak mendapatkan akses ke peminjaman SEKPiM.
         */
        if (
            in_array(
                $user->role,
                [
                    'admin',
                    'admin_sekpim',
                    'superadmin',
                ],
                true
            )
        ) {
            return true;
        }

        return (int) $borrowRequest->user_id === (int) $user->id;
    }

    /**
     * Memvalidasi perlengkapan ketika user membuat pengajuan.
     *
     * Stok akan diperiksa kembali saat barang diserahkan karena
     * stok dapat berubah setelah pengajuan dibuat.
     */
    private function validateBorrowItems(array $items): void
    {
        foreach ($items as $item) {
            $product = Product::query()
                ->findOrFail($item['product_id']);

            if ($product->status !== 'active') {
                $this->abortJson(
                    "Perlengkapan {$product->name} sedang tidak aktif.",
                    422
                );
            }

            if (!in_array($product->type, ['borrow', 'both'], true)) {
                $this->abortJson(
                    "Produk {$product->name} tidak tersedia untuk peminjaman.",
                    422
                );
            }

            if ((int) $product->stock < (int) $item['quantity']) {
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
                now()->format('YmdHis'),
                strtoupper(Str::random(5))
            );
        } while (
            BorrowRequest::query()
                ->where('borrow_code', $borrowCode)
                ->exists()
        );

        return $borrowCode;
    }

    /**
     * Menghentikan proses dengan response JSON konsisten.
     */
    private function abortJson(string $message, int $statusCode): never
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => $message,
                'data' => null,
            ], $statusCode)
        );
    }
}