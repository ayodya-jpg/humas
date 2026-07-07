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
     * Menampilkan semua permintaan merchandise.
     */
    public function index(Request $request): JsonResponse
    {
        $orders = Order::with(['user', 'items.product.category'])
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar permintaan merchandise berhasil diambil.',
            'data' => $orders,
        ]);
    }

    /**
     * Menampilkan permintaan merchandise milik user yang sedang login.
     */
    public function myOrders(Request $request): JsonResponse
    {
        $orders = Order::with(['items.product.category'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat permintaan merchandise berhasil diambil.',
            'data' => $orders,
        ]);
    }

    /**
     * Menampilkan detail permintaan merchandise.
     */
    public function show(string $id): JsonResponse
    {
        $order = Order::with(['user', 'items.product.category'])->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Permintaan merchandise tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail permintaan merchandise berhasil diambil.',
            'data' => $order,
        ]);
    }

    /**
     * Membuat permintaan merchandise.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_name' => ['required', 'string', 'max:255'],
            'institution_name' => ['required', 'string', 'max:255'],
            'guest_name' => ['required', 'string', 'max:255'],
            'guest_position' => ['required', 'string', 'max:255'],
            'activity_date' => ['required', 'date'],
            'user_note' => ['required', 'string'],

            /**
             * File bukti agar bisa dibuka langsung di browser.
             * PDF/JPG/PNG biasanya bisa preview tanpa download.
             */
            'proof_file' => [
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:5120',
            ],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        try {
            $order = DB::transaction(function () use ($validated, $request) {
                $proofFile = $request->file('proof_file');

                $proofFilePath = $proofFile->store('merchandise-proofs', 'public');

                $order = Order::create([
                    'user_id' => $request->user()->id,
                    'order_code' => $this->generateOrderCode(),
                    'event_name' => $validated['event_name'],
                    'institution_name' => $validated['institution_name'],
                    'guest_name' => $validated['guest_name'],
                    'guest_position' => $validated['guest_position'],
                    'activity_date' => $validated['activity_date'],
                    'proof_link' => null,
                    'proof_file_path' => $proofFilePath,
                    'proof_file_name' => $proofFile->getClientOriginalName(),
                    'proof_file_mime' => $proofFile->getClientMimeType(),
                    'user_note' => $validated['user_note'],
                    'status' => 'pending',
                    'submitted_at' => now(),
                ]);

                foreach ($validated['items'] as $item) {
                    $product = Product::findOrFail($item['product_id']);

                    if (!in_array($product->type, ['checkout', 'both'])) {
                        throw new \Exception("Paket {$product->name} tidak bisa diajukan sebagai merchandise.");
                    }

                    if ($product->status !== 'active') {
                        throw new \Exception("Paket {$product->name} sedang tidak aktif.");
                    }

                    if ($product->stock < $item['quantity']) {
                        throw new \Exception("Stok paket {$product->name} tidak mencukupi.");
                    }

                    $order->items()->create([
                        'product_id' => $product->id,
                        'quantity' => $item['quantity'],
                    ]);
                }

                return $order->load(['user', 'items.product.category']);
            });

            return response()->json([
                'success' => true,
                'message' => 'Permintaan merchandise berhasil diajukan dan menunggu approval.',
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
     * Admin menyetujui permintaan merchandise.
     */
    public function approve(string $id): JsonResponse
    {
        $order = Order::with('items.product')->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Permintaan merchandise tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($order->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Permintaan hanya bisa disetujui jika status masih pending.',
                'data' => $order,
            ], 422);
        }

        try {
            DB::transaction(function () use ($order) {
                foreach ($order->items as $item) {
                    $product = $item->product;

                    if (!$product) {
                        throw new \Exception('Paket merchandise tidak ditemukan.');
                    }

                    if ($product->stock < $item->quantity) {
                        throw new \Exception("Stok paket {$product->name} tidak mencukupi.");
                    }

                    $product->decrement('stock', $item->quantity);
                }

                $order->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Permintaan merchandise berhasil disetujui.',
                'data' => $order->load(['user', 'items.product.category']),
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
     * Admin meminta revisi permintaan merchandise.
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
                'message' => 'Permintaan merchandise tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $order->update([
            'status' => 'revision',
            'admin_note' => $validated['admin_note'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Permintaan merchandise dikembalikan untuk revisi.',
            'data' => $order->load(['user', 'items.product.category']),
        ]);
    }

    /**
     * Admin menolak permintaan merchandise.
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
                'message' => 'Permintaan merchandise tidak ditemukan.',
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
            'message' => 'Permintaan merchandise berhasil ditolak.',
            'data' => $order->load(['user', 'items.product.category']),
        ]);
    }

    /**
     * Admin menandai permintaan merchandise selesai.
     */
    public function complete(string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Permintaan merchandise tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($order->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Permintaan hanya bisa diselesaikan jika status approved.',
                'data' => $order,
            ], 422);
        }

        $order->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Permintaan merchandise berhasil diselesaikan.',
            'data' => $order->load(['user', 'items.product.category']),
        ]);
    }

    private function generateOrderCode(): string
    {
        return 'MRC-' . now()->format('YmdHis') . '-' . random_int(100, 999);
    }
}