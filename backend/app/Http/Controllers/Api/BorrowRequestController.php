<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BorrowRequest;
use App\Models\BorrowRequestItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BorrowRequestController extends Controller
{
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
            $borrowRequest = DB::transaction(function () use ($request, $validated) {
                foreach ($validated['items'] as $item) {
                    $product = Product::findOrFail($item['product_id']);

                    if ($product->status !== 'active') {
                        abort(response()->json([
                            'success' => false,
                            'message' => "Barang {$product->name} sedang tidak aktif.",
                            'data' => null,
                        ], 422));
                    }

                    if (!in_array($product->type, ['borrow', 'both'], true)) {
                        abort(response()->json([
                            'success' => false,
                            'message' => "Barang {$product->name} tidak tersedia untuk peminjaman.",
                            'data' => null,
                        ], 422));
                    }

                    if ($product->stock < $item['quantity']) {
                        abort(response()->json([
                            'success' => false,
                            'message' => "Stok {$product->name} tidak mencukupi.",
                            'data' => null,
                        ], 422));
                    }
                }

                $borrowRequest = BorrowRequest::create([
                    'user_id' => $request->user()->id,
                    'borrow_code' => 'BRW-' . now()->format('YmdHis') . '-' . random_int(100, 999),
                    'purpose' => $validated['purpose'],
                    'borrow_date' => $validated['borrow_date'],
                    'return_date' => $validated['return_date'],
                    'status' => 'pending',
                    'admin_note' => null,
                    'submitted_at' => now(),
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
        } catch (\Throwable $error) {
            if ($error instanceof \Illuminate\Http\Exceptions\HttpResponseException) {
                throw $error;
            }

            return response()->json([
                'success' => false,
                'message' => 'Pengajuan peminjaman gagal dikirim.',
                'data' => config('app.debug') ? $error->getMessage() : null,
            ], 500);
        }
    }

    public function approve(int $id): JsonResponse
    {
        $borrowRequest = BorrowRequest::with('items.product')->findOrFail($id);

        if ($borrowRequest->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan hanya bisa di-approve saat status pending.',
                'data' => null,
            ], 422);
        }

        try {
            DB::transaction(function () use ($borrowRequest) {
                foreach ($borrowRequest->items as $item) {
                    $product = Product::lockForUpdate()->findOrFail($item->product_id);

                    if ($product->stock < $item->quantity) {
                        abort(response()->json([
                            'success' => false,
                            'message' => "Stok {$product->name} tidak mencukupi.",
                            'data' => null,
                        ], 422));
                    }

                    $product->decrement('stock', $item->quantity);
                }

                $borrowRequest->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'rejected_at' => null,
                    'admin_note' => null,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan peminjaman berhasil di-approve.',
                'data' => $borrowRequest->fresh([
                    'user',
                    'items.product.category',
                ]),
            ]);
        } catch (\Throwable $error) {
            if ($error instanceof \Illuminate\Http\Exceptions\HttpResponseException) {
                throw $error;
            }

            return response()->json([
                'success' => false,
                'message' => 'Approval peminjaman gagal diproses.',
                'data' => config('app.debug') ? $error->getMessage() : null,
            ], 500);
        }
    }

    public function revision(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'admin_note' => ['required', 'string'],
        ]);

        $borrowRequest = BorrowRequest::findOrFail($id);

        if ($borrowRequest->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Revisi hanya bisa diberikan saat status pending.',
                'data' => null,
            ], 422);
        }

        $borrowRequest->update([
            'status' => 'revision',
            'admin_note' => $validated['admin_note'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Catatan revisi berhasil dikirim.',
            'data' => $borrowRequest->fresh([
                'user',
                'items.product.category',
            ]),
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'admin_note' => ['required', 'string'],
        ]);

        $borrowRequest = BorrowRequest::findOrFail($id);

        if ($borrowRequest->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan hanya bisa ditolak saat status pending.',
                'data' => null,
            ], 422);
        }

        $borrowRequest->update([
            'status' => 'rejected',
            'admin_note' => $validated['admin_note'],
            'rejected_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan peminjaman berhasil ditolak.',
            'data' => $borrowRequest->fresh([
                'user',
                'items.product.category',
            ]),
        ]);
    }

    public function borrowed(int $id): JsonResponse
    {
        $borrowRequest = BorrowRequest::findOrFail($id);

        if ($borrowRequest->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan hanya bisa ditandai dipinjam saat status approved.',
                'data' => null,
            ], 422);
        }

        $borrowRequest->update([
            'status' => 'borrowed',
            'borrowed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Barang berhasil ditandai sudah dipinjam.',
            'data' => $borrowRequest->fresh([
                'user',
                'items.product.category',
            ]),
        ]);
    }

    public function returned(int $id): JsonResponse
    {
        $borrowRequest = BorrowRequest::with('items.product')->findOrFail($id);

        if ($borrowRequest->status !== 'borrowed') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan hanya bisa ditandai kembali saat status borrowed.',
                'data' => null,
            ], 422);
        }

        DB::transaction(function () use ($borrowRequest) {
            foreach ($borrowRequest->items as $item) {
                $product = Product::lockForUpdate()->findOrFail($item->product_id);
                $product->increment('stock', $item->quantity);
            }

            $borrowRequest->update([
                'status' => 'returned',
                'returned_at' => now(),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Barang berhasil ditandai sudah dikembalikan.',
            'data' => $borrowRequest->fresh([
                'user',
                'items.product.category',
            ]),
        ]);
    }

    private function canAccessBorrowRequest(Request $request, BorrowRequest $borrowRequest): bool
    {
        $user = $request->user();

        if (in_array($user->role, ['admin', 'superadmin'], true)) {
            return true;
        }

        return $borrowRequest->user_id === $user->id;
    }
}