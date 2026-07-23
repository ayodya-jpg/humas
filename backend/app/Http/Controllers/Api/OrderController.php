<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class OrderController extends Controller
{
    /**
     * Menampilkan seluruh pengajuan merchandise.
     *
     * Route endpoint ini dilindungi permission:
     * approval.merchandise.view
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'approval.merchandise.view'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin melihat seluruh pengajuan merchandise.'
            );
        }

        $orders = Order::query()
            ->with([
                'user',
                'items.product.category',
            ])
            ->latest('submitted_at')
            ->latest('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data pengajuan merchandise berhasil diambil.',
            'data' => $orders,
        ]);
    }

    /**
     * Menampilkan riwayat pengajuan merchandise milik user login.
     *
     * Pengguna hanya menerima data yang user_id-nya sama
     * dengan akun yang sedang login.
     */
    public function myOrders(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'request.history.view'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin melihat riwayat pengajuan.'
            );
        }

        $orders = Order::query()
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
            'message' => 'Riwayat pengajuan merchandise berhasil diambil.',
            'data' => $orders,
        ]);
    }

    /**
     * Menampilkan detail pengajuan merchandise.
     *
     * Aturan akses:
     * - superadmin dapat melihat seluruh data;
     * - pemilik approval.merchandise.view dapat melihat seluruh data;
     * - pemilik request.history.view hanya dapat melihat data miliknya;
     * - user lain mendapatkan 403.
     */
    public function show(
        Request $request,
        int $id
    ): JsonResponse {
        $order = Order::query()
            ->with([
                'user',
                'items.product.category',
            ])
            ->findOrFail($id);

        if (
            !$this->canAccessOrder(
                $request,
                $order
            )
        ) {
            return $this->forbiddenResponse(
                'Akses ditolak. Kamu tidak memiliki izin melihat pengajuan merchandise ini.'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail pengajuan merchandise berhasil diambil.',
            'data' => $order,
        ]);
    }

    /**
     * Menyimpan pengajuan merchandise baru.
     *
     * Stok belum dikurangi pada tahap ini.
     * Stok baru dikurangi saat pengajuan disetujui admin.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'request.merchandise.create'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin membuat pengajuan merchandise.'
            );
        }

        $validated = $request->validate([
            'event_name' => [
                'required',
                'string',
                'max:255',
            ],

            'institution_name' => [
                'required',
                'string',
                'max:255',
            ],

            'guest_name' => [
                'required',
                'string',
                'max:255',
            ],

            'guest_position' => [
                'required',
                'string',
                'max:255',
            ],

            'activity_date' => [
                'required',
                'date',
            ],

            'user_note' => [
                'required',
                'string',
                'max:5000',
            ],

            'proof_file' => [
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:5120',
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
            'event_name.required' => 'Nama kegiatan wajib diisi.',
            'event_name.max' => 'Nama kegiatan maksimal 255 karakter.',

            'institution_name.required' => 'Nama instansi wajib diisi.',
            'institution_name.max' => 'Nama instansi maksimal 255 karakter.',

            'guest_name.required' => 'Nama tamu wajib diisi.',
            'guest_name.max' => 'Nama tamu maksimal 255 karakter.',

            'guest_position.required' => 'Jabatan tamu wajib diisi.',
            'guest_position.max' => 'Jabatan tamu maksimal 255 karakter.',

            'activity_date.required' => 'Tanggal kegiatan wajib diisi.',
            'activity_date.date' => 'Format tanggal kegiatan tidak valid.',

            'user_note.required' => 'Catatan atau tujuan pengajuan wajib diisi.',
            'user_note.max' => 'Catatan pemohon maksimal 5.000 karakter.',

            'proof_file.required' => 'Dokumen pendukung wajib diunggah.',
            'proof_file.file' => 'Lampiran harus berupa file.',
            'proof_file.mimes' => 'Lampiran harus berformat PDF, JPG, JPEG, atau PNG.',
            'proof_file.max' => 'Ukuran lampiran maksimal 5 MB.',

            'items.required' => 'Pilih minimal satu merchandise.',
            'items.array' => 'Format daftar merchandise tidak valid.',
            'items.min' => 'Pilih minimal satu merchandise.',

            'items.*.product_id.required' => 'Produk merchandise wajib dipilih.',
            'items.*.product_id.distinct' => 'Produk merchandise tidak boleh dipilih lebih dari satu kali.',
            'items.*.product_id.exists' => 'Produk merchandise tidak ditemukan.',

            'items.*.quantity.required' => 'Jumlah merchandise wajib diisi.',
            'items.*.quantity.integer' => 'Jumlah merchandise harus berupa angka.',
            'items.*.quantity.min' => 'Jumlah merchandise minimal satu.',
        ]);

        $proofFilePath = null;

        try {
            $proofFile = $request->file(
                'proof_file'
            );

            $proofFilePath = $proofFile->store(
                'merchandise-proofs',
                'public'
            );

            $order = DB::transaction(function () use (
                $user,
                $validated,
                $proofFile,
                $proofFilePath
            ): Order {
                $this->validateOrderItems(
                    $validated['items']
                );

                $order = Order::query()->create([
                    'user_id' => $user->id,
                    'order_code' => $this->generateOrderCode(),

                    'event_name' => trim(
                        $validated['event_name']
                    ),

                    'institution_name' => trim(
                        $validated['institution_name']
                    ),

                    'guest_name' => trim(
                        $validated['guest_name']
                    ),

                    'guest_position' => trim(
                        $validated['guest_position']
                    ),

                    'activity_date' => $validated['activity_date'],

                    'proof_link' => null,
                    'proof_file_path' => $proofFilePath,
                    'proof_file_name' => $proofFile->getClientOriginalName(),
                    'proof_file_mime' => $proofFile->getMimeType(),

                    'status' => 'pending',

                    'user_note' => trim(
                        $validated['user_note']
                    ),

                    'admin_note' => null,

                    'submitted_at' => now(),
                    'approved_at' => null,
                    'rejected_at' => null,
                    'completed_at' => null,
                ]);

                foreach (
                    $validated['items']
                    as $item
                ) {
                    OrderItem::query()->create([
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
        } catch (HttpResponseException $error) {
            $this->deleteFileIfExists(
                $proofFilePath
            );

            throw $error;
        } catch (Throwable $error) {
            $this->deleteFileIfExists(
                $proofFilePath
            );

            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Pengajuan merchandise gagal dikirim. Silakan periksa kembali data pengajuan atau hubungi admin.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Menyetujui pengajuan merchandise.
     *
     * Stok dipotong tepat satu kali saat status berubah
     * dari pending menjadi approved.
     */
    public function approve(
        Request $request,
        int $id
    ): JsonResponse {
        if (
            !$this->canProcessOrder(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin menyetujui pengajuan merchandise.'
            );
        }

        try {
            $order = DB::transaction(
                function () use ($id): Order {
                    $lockedOrder = Order::query()
                        ->lockForUpdate()
                        ->findOrFail($id);

                    if (
                        $lockedOrder->status !==
                        'pending'
                    ) {
                        $this->abortJson(
                            'Pengajuan hanya bisa disetujui saat status masih menunggu.',
                            422
                        );
                    }

                    $lockedOrder->load([
                        'items.product',
                    ]);

                    if (
                        $lockedOrder->items->isEmpty()
                    ) {
                        $this->abortJson(
                            'Pengajuan tidak memiliki item merchandise.',
                            422
                        );
                    }

                    foreach (
                        $lockedOrder->items
                        as $item
                    ) {
                        if (!$item->product_id) {
                            $this->abortJson(
                                'Salah satu produk pada pengajuan sudah tidak tersedia.',
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
                                'Salah satu produk pada pengajuan tidak ditemukan.',
                                422
                            );
                        }

                        if (
                            $product->status !==
                            'active'
                        ) {
                            $this->abortJson(
                                "Produk {$product->name} sedang tidak aktif.",
                                422
                            );
                        }

                        if (
                            !in_array(
                                $product->type,
                                [
                                    'checkout',
                                    'both',
                                ],
                                true
                            )
                        ) {
                            $this->abortJson(
                                "Produk {$product->name} tidak tersedia untuk merchandise.",
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

                        $product->decrement(
                            'stock',
                            (int) $item->quantity
                        );
                    }

                    $lockedOrder->update([
                        'status' => 'approved',
                        'admin_note' => null,
                        'approved_at' => now(),
                        'rejected_at' => null,
                        'completed_at' => null,
                    ]);

                    return $lockedOrder->fresh([
                        'user',
                        'items.product.category',
                    ]);
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan merchandise berhasil disetujui.',
                'data' => $order,
            ]);
        } catch (HttpResponseException $error) {
            throw $error;
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Approval merchandise gagal diproses.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Menolak pengajuan merchandise.
     */
    public function reject(
        Request $request,
        int $id
    ): JsonResponse {
        if (
            !$this->canProcessOrder(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin menolak pengajuan merchandise.'
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
            $order = DB::transaction(
                function () use (
                    $id,
                    $validated
                ): Order {
                    $lockedOrder = Order::query()
                        ->lockForUpdate()
                        ->findOrFail($id);

                    if (
                        $lockedOrder->status !==
                        'pending'
                    ) {
                        $this->abortJson(
                            'Pengajuan hanya bisa ditolak saat status masih menunggu.',
                            422
                        );
                    }

                    $lockedOrder->update([
                        'status' => 'rejected',

                        'admin_note' => trim(
                            $validated['admin_note']
                        ),

                        'rejected_at' => now(),
                        'approved_at' => null,
                        'completed_at' => null,
                    ]);

                    return $lockedOrder->fresh([
                        'user',
                        'items.product.category',
                    ]);
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan merchandise berhasil ditolak.',
                'data' => $order,
            ]);
        } catch (HttpResponseException $error) {
            throw $error;
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Penolakan pengajuan merchandise gagal diproses.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Menandai layanan merchandise selesai.
     */
    public function complete(
        Request $request,
        int $id
    ): JsonResponse {
        if (
            !$this->canProcessOrder(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin menyelesaikan pengajuan merchandise.'
            );
        }

        $validated = $request->validate([
            'admin_note' => [
                'nullable',
                'string',
                'max:2000',
            ],
        ], [
            'admin_note.max' => 'Catatan penyelesaian maksimal 2.000 karakter.',
        ]);

        try {
            $order = DB::transaction(
                function () use (
                    $id,
                    $validated
                ): Order {
                    $lockedOrder = Order::query()
                        ->lockForUpdate()
                        ->findOrFail($id);

                    if (
                        $lockedOrder->status !==
                        'approved'
                    ) {
                        $this->abortJson(
                            'Pengajuan hanya bisa diselesaikan setelah disetujui.',
                            422
                        );
                    }

                    $adminNote =
                        array_key_exists(
                            'admin_note',
                            $validated
                        ) &&
                        $validated['admin_note'] !==
                            null
                            ? trim(
                                $validated['admin_note']
                            )
                            : $lockedOrder->admin_note;

                    $lockedOrder->update([
                        'status' => 'completed',
                        'admin_note' => $adminNote,
                        'completed_at' => now(),
                    ]);

                    return $lockedOrder->fresh([
                        'user',
                        'items.product.category',
                    ]);
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan merchandise berhasil ditandai selesai.',
                'data' => $order,
            ]);
        } catch (HttpResponseException $error) {
            throw $error;
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Penyelesaian pengajuan merchandise gagal diproses.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Memeriksa akses detail pengajuan.
     */
    private function canAccessOrder(
        Request $request,
        Order $order
    ): bool {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        /*
         * Superadmin atau pemilik permission approval
         * dapat melihat seluruh pengajuan merchandise.
         */
        if (
            $this->userHasPermission(
                $user,
                'approval.merchandise.view'
            )
        ) {
            return true;
        }

        /*
         * Pengguna dengan akses riwayat hanya boleh
         * melihat data miliknya sendiri.
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
            (int) $order->user_id ===
            (int) $user->id
        );
    }

    /**
     * Memeriksa permission proses approval merchandise.
     */
    private function canProcessOrder(
        Request $request
    ): bool {
        $user = $request->user();

        return (
            $user !== null &&
            $this->userHasPermission(
                $user,
                'approval.merchandise.process'
            )
        );
    }

    /**
     * Memeriksa permission user.
     *
     * Method ini mendukung helper hasPermission() pada model User
     * dan tetap mempunyai fallback ketika helper belum tersedia.
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
     * Memeriksa produk ketika user membuat pengajuan.
     */
    private function validateOrderItems(
        array $items
    ): void {
        foreach ($items as $item) {
            $product = Product::query()
                ->find(
                    $item['product_id']
                );

            if (!$product) {
                $this->abortJson(
                    'Salah satu produk merchandise tidak ditemukan.',
                    422
                );
            }

            if (
                $product->status !==
                'active'
            ) {
                $this->abortJson(
                    "Produk {$product->name} sedang tidak aktif.",
                    422
                );
            }

            if (
                !in_array(
                    $product->type,
                    [
                        'checkout',
                        'both',
                    ],
                    true
                )
            ) {
                $this->abortJson(
                    "Produk {$product->name} tidak tersedia untuk pengajuan merchandise.",
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
     * Menghasilkan kode order unik.
     */
    private function generateOrderCode(): string
    {
        do {
            $orderCode = sprintf(
                'MER-%s-%s',
                now()->format(
                    'YmdHis'
                ),
                strtoupper(
                    Str::random(5)
                )
            );
        } while (
            Order::query()
                ->where(
                    'order_code',
                    $orderCode
                )
                ->exists()
        );

        return $orderCode;
    }

    /**
     * Menghapus file ketika transaksi gagal.
     */
    private function deleteFileIfExists(
        ?string $filePath
    ): void {
        if (!$filePath) {
            return;
        }

        if (
            Storage::disk('public')
                ->exists($filePath)
        ) {
            Storage::disk('public')
                ->delete($filePath);
        }
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
     * Menghentikan proses dan mengembalikan JSON konsisten.
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