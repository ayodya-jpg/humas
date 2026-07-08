<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function index(): JsonResponse
    {
        $orders = Order::with([
            'user',
            'items.product.category',
        ])
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data pengajuan merchandise berhasil diambil.',
            'data' => $orders,
        ]);
    }

    public function myOrders(Request $request): JsonResponse
    {
        $orders = Order::with([
            'items.product.category',
        ])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat pengajuan merchandise berhasil diambil.',
            'data' => $orders,
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $order = Order::with([
            'user',
            'items.product.category',
        ])->findOrFail($id);

        if (!$this->canAccessOrder($request, $order)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Kamu tidak memiliki izin melihat pengajuan ini.',
                'data' => null,
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail pengajuan merchandise berhasil diambil.',
            'data' => $order,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_name' => ['required', 'string', 'max:255'],
            'institution_name' => ['required', 'string', 'max:255'],
            'guest_name' => ['required', 'string', 'max:255'],
            'guest_position' => ['required', 'string', 'max:255'],
            'activity_date' => ['required', 'date'],
            'user_note' => ['required', 'string'],
            'proof_file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        try {
            $order = DB::transaction(function () use ($request, $validated) {
                foreach ($validated['items'] as $item) {
                    $product = Product::findOrFail($item['product_id']);

                    if ($product->status !== 'active') {
                        abort(response()->json([
                            'success' => false,
                            'message' => "Produk {$product->name} sedang tidak aktif.",
                            'data' => null,
                        ], 422));
                    }

                    if (!in_array($product->type, ['checkout', 'both'], true)) {
                        abort(response()->json([
                            'success' => false,
                            'message' => "Produk {$product->name} tidak tersedia untuk pengajuan merchandise.",
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

                $proofFile = $request->file('proof_file');
                $proofFilePath = $proofFile->store('merchandise-proofs', 'public');

                $order = Order::create([
                    'user_id' => $request->user()->id,
                    'order_code' => 'MER-' . now()->format('YmdHis') . '-' . random_int(100, 999),
                    'event_name' => $validated['event_name'],
                    'institution_name' => $validated['institution_name'],
                    'guest_name' => $validated['guest_name'],
                    'guest_position' => $validated['guest_position'],
                    'activity_date' => $validated['activity_date'],
                    'proof_link' => null,
                    'proof_file_path' => $proofFilePath,
                    'proof_file_name' => $proofFile->getClientOriginalName(),
                    'proof_file_mime' => $proofFile->getMimeType(),
                    'status' => 'pending',
                    'user_note' => $validated['user_note'],
                    'admin_note' => null,
                    'submitted_at' => now(),
                ]);

                foreach ($validated['items'] as $item) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                    ]);
                }

                return $order->load([
                    'user',
                    'items.product.category',
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan merchandise berhasil dikirim.',
                'data' => $order,
            ], 201);
        } catch (\Throwable $error) {
            if ($error instanceof \Illuminate\Http\Exceptions\HttpResponseException) {
                throw $error;
            }

            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Pengajuan merchandise gagal dikirim. Silakan periksa kembali data pengajuan atau hubungi admin.',
                'data' => null,
            ], 500);
        }
    }

    public function approve(int $id): JsonResponse
    {
        $order = Order::with('items.product')->findOrFail($id);

        if ($order->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan hanya bisa di-approve saat status pending.',
                'data' => null,
            ], 422);
        }

        try {
            DB::transaction(function () use ($order) {
                foreach ($order->items as $item) {
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

                $order->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'rejected_at' => null,
                    'admin_note' => null,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan merchandise berhasil di-approve.',
                'data' => $order->fresh([
                    'user',
                    'items.product.category',
                ]),
            ]);
        } catch (\Throwable $error) {
            if ($error instanceof \Illuminate\Http\Exceptions\HttpResponseException) {
                throw $error;
            }

            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Approval merchandise gagal diproses.',
                'data' => null,
            ], 500);
        }
    }

    public function revision(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'admin_note' => ['required', 'string'],
        ]);

        $order = Order::findOrFail($id);

        if ($order->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Revisi hanya bisa diberikan saat status pending.',
                'data' => null,
            ], 422);
        }

        $order->update([
            'status' => 'revision',
            'admin_note' => $validated['admin_note'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Catatan revisi berhasil dikirim.',
            'data' => $order->fresh([
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

        $order = Order::findOrFail($id);

        if ($order->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan hanya bisa ditolak saat status pending.',
                'data' => null,
            ], 422);
        }

        $order->update([
            'status' => 'rejected',
            'admin_note' => $validated['admin_note'],
            'rejected_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan merchandise berhasil ditolak.',
            'data' => $order->fresh([
                'user',
                'items.product.category',
            ]),
        ]);
    }

    public function complete(int $id): JsonResponse
    {
        $order = Order::findOrFail($id);

        if ($order->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan hanya bisa diselesaikan saat status approved.',
                'data' => null,
            ], 422);
        }

        $order->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan merchandise berhasil ditandai selesai.',
            'data' => $order->fresh([
                'user',
                'items.product.category',
            ]),
        ]);
    }

    private function canAccessOrder(Request $request, Order $order): bool
    {
        $user = $request->user();

        if (in_array($user->role, ['admin', 'superadmin'], true)) {
            return true;
        }

        return $order->user_id === $user->id;
    }
}