<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BorrowRequest;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BorrowRequestController extends Controller
{
    /**
     * Menampilkan semua pengajuan peminjaman.
     */
    public function index(): JsonResponse
    {
        $borrowRequests = BorrowRequest::with(['items.product.category'])
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar pengajuan peminjaman berhasil diambil.',
            'data' => $borrowRequests,
        ]);
    }

    /**
     * Menampilkan detail pengajuan peminjaman.
     */
    public function show(string $id): JsonResponse
    {
        $borrowRequest = BorrowRequest::with(['items.product.category'])->find($id);

        if (!$borrowRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan peminjaman tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail pengajuan peminjaman berhasil diambil.',
            'data' => $borrowRequest,
        ]);
    }

    /**
     * Membuat pengajuan peminjaman.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'purpose' => ['required', 'string'],
            'borrow_date' => ['required', 'date'],
            'return_date' => ['required', 'date', 'after_or_equal:borrow_date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        try {
            $borrowRequest = DB::transaction(function () use ($validated) {
                $borrowRequest = BorrowRequest::create([
                    'user_id' => null,
                    'borrow_code' => $this->generateBorrowCode(),
                    'purpose' => $validated['purpose'],
                    'borrow_date' => $validated['borrow_date'],
                    'return_date' => $validated['return_date'],
                    'status' => 'pending',
                    'submitted_at' => now(),
                ]);

                foreach ($validated['items'] as $item) {
                    $product = Product::findOrFail($item['product_id']);

                    if (!in_array($product->type, ['borrow', 'both'])) {
                        throw new \Exception("Produk {$product->name} tidak bisa dipinjam.");
                    }

                    if ($product->status !== 'active') {
                        throw new \Exception("Produk {$product->name} sedang tidak aktif.");
                    }

                    if ($product->stock < $item['quantity']) {
                        throw new \Exception("Stok produk {$product->name} tidak mencukupi.");
                    }

                    $borrowRequest->items()->create([
                        'product_id' => $product->id,
                        'quantity' => $item['quantity'],
                    ]);
                }

                return $borrowRequest->load(['items.product.category']);
            });

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan peminjaman berhasil dibuat dan menunggu approval admin.',
                'data' => $borrowRequest,
            ], 201);
        } catch (\Exception $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
                'data' => null,
            ], 422);
        }
    }

    /**
     * Admin menyetujui pengajuan peminjaman.
     */
    public function approve(string $id): JsonResponse
    {
        $borrowRequest = BorrowRequest::with('items.product')->find($id);

        if (!$borrowRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan peminjaman tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($borrowRequest->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan hanya bisa disetujui jika status masih pending.',
                'data' => $borrowRequest,
            ], 422);
        }

        try {
            DB::transaction(function () use ($borrowRequest) {
                foreach ($borrowRequest->items as $item) {
                    $product = $item->product;

                    if (!$product) {
                        throw new \Exception('Produk pada pengajuan tidak ditemukan.');
                    }

                    if ($product->stock < $item->quantity) {
                        throw new \Exception("Stok produk {$product->name} tidak mencukupi.");
                    }

                    $product->decrement('stock', $item->quantity);
                }

                $borrowRequest->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                ]);
            });

            $borrowRequest->load(['items.product.category']);

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan peminjaman berhasil disetujui.',
                'data' => $borrowRequest,
            ]);
        } catch (\Exception $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
                'data' => null,
            ], 422);
        }
    }

    /**
     * Admin meminta revisi pengajuan peminjaman.
     */
    public function revision(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'admin_note' => ['required', 'string'],
        ]);

        $borrowRequest = BorrowRequest::find($id);

        if (!$borrowRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan peminjaman tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $borrowRequest->update([
            'status' => 'revision',
            'admin_note' => $validated['admin_note'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan peminjaman dikembalikan untuk revisi.',
            'data' => $borrowRequest->load(['items.product.category']),
        ]);
    }

    /**
     * Admin menolak pengajuan peminjaman.
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'admin_note' => ['required', 'string'],
        ]);

        $borrowRequest = BorrowRequest::find($id);

        if (!$borrowRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan peminjaman tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $borrowRequest->update([
            'status' => 'rejected',
            'admin_note' => $validated['admin_note'],
            'rejected_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan peminjaman berhasil ditolak.',
            'data' => $borrowRequest->load(['items.product.category']),
        ]);
    }

    /**
     * Admin menandai barang sedang dipinjam.
     */
    public function borrowed(string $id): JsonResponse
    {
        $borrowRequest = BorrowRequest::find($id);

        if (!$borrowRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan peminjaman tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($borrowRequest->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Status hanya bisa menjadi borrowed jika sudah approved.',
                'data' => $borrowRequest,
            ], 422);
        }

        $borrowRequest->update([
            'status' => 'borrowed',
            'borrowed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Barang ditandai sedang dipinjam.',
            'data' => $borrowRequest->load(['items.product.category']),
        ]);
    }

    /**
     * Admin menandai barang sudah dikembalikan.
     */
    public function returned(string $id): JsonResponse
    {
        $borrowRequest = BorrowRequest::with('items.product')->find($id);

        if (!$borrowRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan peminjaman tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if (!in_array($borrowRequest->status, ['approved', 'borrowed'])) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan hanya bisa dikembalikan jika status approved atau borrowed.',
                'data' => $borrowRequest,
            ], 422);
        }

        DB::transaction(function () use ($borrowRequest) {
            foreach ($borrowRequest->items as $item) {
                if ($item->product) {
                    $item->product->increment('stock', $item->quantity);
                }
            }

            $borrowRequest->update([
                'status' => 'returned',
                'returned_at' => now(),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Barang berhasil ditandai sudah dikembalikan.',
            'data' => $borrowRequest->load(['items.product.category']),
        ]);
    }

    private function generateBorrowCode(): string
    {
        return 'BRW-' . now()->format('YmdHis') . '-' . random_int(100, 999);
    }
}