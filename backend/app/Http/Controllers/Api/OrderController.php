<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Menampilkan semua order.
     * Untuk awal belum dibatasi role admin/user.
     */
    public function index(): JsonResponse
    {
        $orders = Order::with(['items.product.category'])
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar order berhasil diambil.',
            'data' => $orders,
        ]);
    }

    /**
     * Menampilkan detail order.
     */
    public function show(string $id): JsonResponse
    {
        $order = Order::with(['items.product.category'])->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail order berhasil diambil.',
            'data' => $order,
        ]);
    }

    /**
     * Membuat checkout tanpa pembayaran.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_note' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        try {
            $order = DB::transaction(function () use ($validated) {
                $order = Order::create([
                    'user_id' => null,
                    'order_code' => $this->generateOrderCode(),
                    'status' => 'pending',
                    'user_note' => $validated['user_note'] ?? null,
                    'submitted_at' => now(),
                ]);

                foreach ($validated['items'] as $item) {
                    $product = Product::findOrFail($item['product_id']);

                    if (!in_array($product->type, ['checkout', 'both'])) {
                        throw new \Exception("Produk {$product->name} tidak bisa di-checkout.");
                    }

                    if ($product->status !== 'active') {
                        throw new \Exception("Produk {$product->name} sedang tidak aktif.");
                    }

                    if ($product->stock < $item['quantity']) {
                        throw new \Exception("Stok produk {$product->name} tidak mencukupi.");
                    }

                    $order->items()->create([
                        'product_id' => $product->id,
                        'quantity' => $item['quantity'],
                    ]);
                }

                return $order->load(['items.product.category']);
            });

            return response()->json([
                'success' => true,
                'message' => 'Checkout berhasil dibuat dan menunggu approval admin.',
                'data' => $order,
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
     * Admin menyetujui order.
     */
    public function approve(string $id): JsonResponse
    {
        $order = Order::with('items.product')->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($order->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Order hanya bisa disetujui jika status masih pending.',
                'data' => $order,
            ], 422);
        }

        try {
            DB::transaction(function () use ($order) {
                foreach ($order->items as $item) {
                    $product = $item->product;

                    if (!$product) {
                        throw new \Exception('Produk pada order tidak ditemukan.');
                    }

                    if ($product->stock < $item->quantity) {
                        throw new \Exception("Stok produk {$product->name} tidak mencukupi.");
                    }

                    $product->decrement('stock', $item->quantity);
                }

                $order->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                ]);
            });

            $order->load(['items.product.category']);

            return response()->json([
                'success' => true,
                'message' => 'Order berhasil disetujui.',
                'data' => $order,
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
     * Admin meminta revisi order.
     */
    public function revision(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'admin_note' => ['required', 'string'],
        ]);

        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $order->update([
            'status' => 'revision',
            'admin_note' => $validated['admin_note'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order dikembalikan untuk revisi.',
            'data' => $order->load(['items.product.category']),
        ]);
    }

    /**
     * Admin menolak order.
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'admin_note' => ['required', 'string'],
        ]);

        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $order->update([
            'status' => 'rejected',
            'admin_note' => $validated['admin_note'],
            'rejected_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order berhasil ditolak.',
            'data' => $order->load(['items.product.category']),
        ]);
    }

    /**
     * Admin menyelesaikan order.
     */
    public function complete(string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($order->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Order hanya bisa diselesaikan jika sudah approved.',
                'data' => $order,
            ], 422);
        }

        $order->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order berhasil diselesaikan.',
            'data' => $order->load(['items.product.category']),
        ]);
    }

    private function generateOrderCode(): string
    {
        return 'ORD-' . now()->format('YmdHis') . '-' . random_int(100, 999);
    }
}