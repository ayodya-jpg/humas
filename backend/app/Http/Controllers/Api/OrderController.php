<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderRevisionHistory;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class OrderController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $user =
            $request->user();

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

        $orders =
            Order::query()
                ->with([
                    'user',
                    'items.product.category',
                    'revisionHistories.requestedBy',
                ])
                ->latest(
                    'updated_at'
                )
                ->latest(
                    'created_at'
                )
                ->get();

        return response()->json([
            'success' => true,
            'message' =>
                'Data pengajuan merchandise berhasil diambil.',
            'data' =>
                $orders,
        ]);
    }

    public function myOrders(
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
                'Kamu tidak memiliki izin melihat riwayat pengajuan.'
            );
        }

        $orders =
            Order::query()
                ->with([
                    'user',
                    'items.product.category',
                    'revisionHistories.requestedBy',
                ])
                ->where(
                    'user_id',
                    $user->id
                )
                ->latest(
                    'updated_at'
                )
                ->latest(
                    'created_at'
                )
                ->get();

        return response()->json([
            'success' => true,
            'message' =>
                'Riwayat pengajuan merchandise berhasil diambil.',
            'data' =>
                $orders,
        ]);
    }

    public function show(
        Request $request,
        int $id
    ): JsonResponse {
        $order =
            Order::query()
                ->with([
                    'user',
                    'items.product.category',
                    'revisionHistories.requestedBy',
                ])
                ->findOrFail(
                    $id
                );

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
            'message' =>
                'Detail pengajuan merchandise berhasil diambil.',
            'data' =>
                $order,
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        $user =
            $request->user();

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

        $validated =
            $this->validateOrderRequest(
                $request,
                true
            );

        $proofFilePath =
            null;

        try {
            $proofFile =
                $request->file(
                    'proof_file'
                );

            $proofFilePath =
                $proofFile->store(
                    'merchandise-proofs',
                    'public'
                );

            $order =
                DB::transaction(
                    function () use (
                        $user,
                        $validated,
                        $proofFile,
                        $proofFilePath
                    ): Order {
                        $this->validateOrderItems(
                            $validated[
                                'items'
                            ]
                        );

                        $order =
                            Order::query()
                                ->create([
                                    'user_id' =>
                                        $user->id,

                                    'order_code' =>
                                        $this->generateOrderCode(),

                                    'event_name' =>
                                        trim(
                                            $validated[
                                                'event_name'
                                            ]
                                        ),

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

                                    'institution_name' =>
                                        trim(
                                            $validated[
                                                'institution_name'
                                            ]
                                        ),

                                    'guest_name' =>
                                        trim(
                                            $validated[
                                                'guest_name'
                                            ]
                                        ),

                                    'guest_position' =>
                                        trim(
                                            $validated[
                                                'guest_position'
                                            ]
                                        ),

                                    'activity_date' =>
                                        $validated[
                                            'activity_date'
                                        ],

                                    'pickup_date' =>
                                        $validated[
                                            'pickup_date'
                                        ],

                                    'proof_link' =>
                                        null,

                                    'proof_file_path' =>
                                        $proofFilePath,

                                    'proof_file_name' =>
                                        $proofFile
                                            ->getClientOriginalName(),

                                    'proof_file_mime' =>
                                        $proofFile
                                            ->getMimeType(),

                                    'status' =>
                                        'pending',

                                    'user_note' =>
                                        trim(
                                            $validated[
                                                'user_note'
                                            ]
                                        ),

                                    'admin_note' =>
                                        null,

                                    'submitted_at' =>
                                        now(),

                                    'revision_requested_at' =>
                                        null,

                                    'resubmitted_at' =>
                                        null,

                                    'approved_at' =>
                                        null,

                                    'rejected_at' =>
                                        null,

                                    'completed_at' =>
                                        null,
                                ]);

                        $this->replaceOrderItems(
                            $order,
                            $validated[
                                'items'
                            ]
                        );

                        return $order
                            ->load([
                                'user',
                                'items.product.category',
                                'revisionHistories.requestedBy',
                            ]);
                    }
                );

            return response()->json([
                'success' => true,
                'message' =>
                    'Pengajuan merchandise berhasil dikirim.',
                'data' =>
                    $order,
            ], 201);
        } catch (
            HttpResponseException $error
        ) {
            $this->deleteFileIfExists(
                $proofFilePath
            );

            throw $error;
        } catch (
            Throwable $error
        ) {
            $this->deleteFileIfExists(
                $proofFilePath
            );

            report(
                $error
            );

            return response()->json([
                'success' => false,
                'message' =>
                    'Pengajuan merchandise gagal dikirim.',
                'data' =>
                    null,
            ], 500);
        }
    }

    public function revision(
        Request $request,
        int $id
    ): JsonResponse {
        if (
            !$this->canProcessOrder(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin meminta revisi pengajuan merchandise.'
            );
        }

        $user =
            $request->user();

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
                    'Catatan revisi wajib diisi.',

                'admin_note.min' =>
                    'Catatan revisi minimal lima karakter.',

                'admin_note.max' =>
                    'Catatan revisi maksimal 2.000 karakter.',
            ]);

        try {
            $order =
                DB::transaction(
                    function () use (
                        $id,
                        $validated,
                        $user
                    ): Order {
                        $lockedOrder =
                            Order::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $id
                                );

                        if (
                            $lockedOrder->status !==
                            'pending'
                        ) {
                            $this->abortJson(
                                'Revisi hanya dapat diminta saat status pengajuan masih menunggu.',
                                422
                            );
                        }

                        $revisionNote =
                            trim(
                                $validated[
                                    'admin_note'
                                ]
                            );

                        $requestedAt =
                            now();

                        OrderRevisionHistory::query()
                            ->create([
                                'order_id' =>
                                    $lockedOrder->id,

                                'requested_by' =>
                                    $user?->id,

                                'revision_note' =>
                                    $revisionNote,

                                'requested_at' =>
                                    $requestedAt,

                                'resubmitted_at' =>
                                    null,
                            ]);

                        $lockedOrder
                            ->update([
                                'status' =>
                                    'revision',

                                'admin_note' =>
                                    $revisionNote,

                                'revision_requested_at' =>
                                    $requestedAt,

                                'resubmitted_at' =>
                                    null,

                                'approved_at' =>
                                    null,

                                'rejected_at' =>
                                    null,

                                'completed_at' =>
                                    null,
                            ]);

                        return $lockedOrder
                            ->fresh([
                                'user',
                                'items.product.category',
                                'revisionHistories.requestedBy',
                            ]);
                    }
                );

            return response()->json([
                'success' => true,
                'message' =>
                    'Pengajuan merchandise dikembalikan kepada pemohon untuk direvisi.',
                'data' =>
                    $order,
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
                'success' => false,
                'message' =>
                    'Permintaan revisi gagal diproses.',
                'data' =>
                    null,
            ], 500);
        }
    }

    public function resubmit(
        Request $request,
        int $id
    ): JsonResponse {
        $user =
            $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'request.merchandise.create'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin memperbarui pengajuan merchandise.'
            );
        }

        $order =
            Order::query()
                ->with([
                    'items',
                    'revisionHistories',
                ])
                ->findOrFail(
                    $id
                );

        if (
            (int) $order->user_id !==
            (int) $user->id
        ) {
            return $this->forbiddenResponse(
                'Kamu hanya dapat memperbaiki pengajuan milik sendiri.'
            );
        }

        if (
            $order->status !==
            'revision'
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Pengajuan hanya dapat diperbarui ketika berstatus revisi.',
                'data' =>
                    null,
            ], 422);
        }

        $validated =
            $this->validateOrderRequest(
                $request,
                false,
                $order
            );

        $newProofFilePath =
            null;

        $oldProofFilePath =
            $order->proof_file_path;

        try {
            $newProofFile =
                $request->file(
                    'proof_file'
                );

            if (
                $newProofFile
            ) {
                $newProofFilePath =
                    $newProofFile
                        ->store(
                            'merchandise-proofs',
                            'public'
                        );
            }

            $updatedOrder =
                DB::transaction(
                    function () use (
                        $order,
                        $validated,
                        $newProofFile,
                        $newProofFilePath
                    ): Order {
                        $lockedOrder =
                            Order::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $order->id
                                );

                        if (
                            $lockedOrder->status !==
                            'revision'
                        ) {
                            $this->abortJson(
                                'Status pengajuan sudah berubah dan tidak dapat dikirim ulang.',
                                422
                            );
                        }

                        $this->validateOrderItems(
                            $validated[
                                'items'
                            ]
                        );

                        $resubmittedAt =
                            now();

                        $revisionHistory =
                            OrderRevisionHistory::query()
                                ->where(
                                    'order_id',
                                    $lockedOrder->id
                                )
                                ->whereNull(
                                    'resubmitted_at'
                                )
                                ->latest(
                                    'requested_at'
                                )
                                ->latest(
                                    'id'
                                )
                                ->lockForUpdate()
                                ->first();

                        if (
                            $revisionHistory
                        ) {
                            $revisionHistory
                                ->update([
                                    'resubmitted_at' =>
                                        $resubmittedAt,
                                ]);
                        }

                        $payload = [
                            'event_name' =>
                                trim(
                                    $validated[
                                        'event_name'
                                    ]
                                ),

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

                            'institution_name' =>
                                trim(
                                    $validated[
                                        'institution_name'
                                    ]
                                ),

                            'guest_name' =>
                                trim(
                                    $validated[
                                        'guest_name'
                                    ]
                                ),

                            'guest_position' =>
                                trim(
                                    $validated[
                                        'guest_position'
                                    ]
                                ),

                            'activity_date' =>
                                $validated[
                                    'activity_date'
                                ],

                            'pickup_date' =>
                                $validated[
                                    'pickup_date'
                                ],

                            'user_note' =>
                                trim(
                                    $validated[
                                        'user_note'
                                    ]
                                ),

                            'status' =>
                                'pending',

                            'admin_note' =>
                                null,

                            'submitted_at' =>
                                $resubmittedAt,

                            'resubmitted_at' =>
                                $resubmittedAt,

                            'approved_at' =>
                                null,

                            'rejected_at' =>
                                null,

                            'completed_at' =>
                                null,
                        ];

                        if (
                            $newProofFile &&
                            $newProofFilePath
                        ) {
                            $payload[
                                'proof_file_path'
                            ] =
                                $newProofFilePath;

                            $payload[
                                'proof_file_name'
                            ] =
                                $newProofFile
                                    ->getClientOriginalName();

                            $payload[
                                'proof_file_mime'
                            ] =
                                $newProofFile
                                    ->getMimeType();
                        }

                        $lockedOrder
                            ->update(
                                $payload
                            );

                        $this->replaceOrderItems(
                            $lockedOrder,
                            $validated[
                                'items'
                            ]
                        );

                        return $lockedOrder
                            ->fresh([
                                'user',
                                'items.product.category',
                                'revisionHistories.requestedBy',
                            ]);
                    }
                );

            if (
                $newProofFilePath &&
                $oldProofFilePath &&
                $newProofFilePath !==
                    $oldProofFilePath
            ) {
                $this->deleteFileIfExists(
                    $oldProofFilePath
                );
            }

            return response()->json([
                'success' => true,
                'message' =>
                    'Perbaikan pengajuan berhasil dikirim ulang.',
                'data' =>
                    $updatedOrder,
            ]);
        } catch (
            HttpResponseException $error
        ) {
            $this->deleteFileIfExists(
                $newProofFilePath
            );

            throw $error;
        } catch (
            Throwable $error
        ) {
            $this->deleteFileIfExists(
                $newProofFilePath
            );

            report(
                $error
            );

            return response()->json([
                'success' => false,
                'message' =>
                    'Perbaikan pengajuan gagal dikirim ulang.',
                'data' =>
                    null,
            ], 500);
        }
    }

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
            $order =
                DB::transaction(
                    function () use (
                        $id
                    ): Order {
                        $lockedOrder =
                            Order::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $id
                                );

                        if (
                            $lockedOrder->status !==
                            'pending'
                        ) {
                            $this->abortJson(
                                'Pengajuan hanya dapat disetujui saat status menunggu.',
                                422
                            );
                        }

                        $lockedOrder
                            ->load([
                                'items.product',
                            ]);

                        if (
                            $lockedOrder
                                ->items
                                ->isEmpty()
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
                            $product =
                                Product::query()
                                    ->lockForUpdate()
                                    ->find(
                                        $item->product_id
                                    );

                            if (
                                !$product
                            ) {
                                $this->abortJson(
                                    'Salah satu produk tidak ditemukan.',
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
                                    "Stok {$product->name} tidak mencukupi.",
                                    422
                                );
                            }

                            $product->decrement(
                                'stock',
                                (int) $item->quantity
                            );
                        }

                        $lockedOrder
                            ->update([
                                'status' =>
                                    'approved',

                                'admin_note' =>
                                    null,

                                'approved_at' =>
                                    now(),

                                'rejected_at' =>
                                    null,

                                'completed_at' =>
                                    null,
                            ]);

                        return $lockedOrder
                            ->fresh([
                                'user',
                                'items.product.category',
                                'revisionHistories.requestedBy',
                            ]);
                    }
                );

            return response()->json([
                'success' => true,
                'message' =>
                    'Pengajuan merchandise berhasil disetujui.',
                'data' =>
                    $order,
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
                'success' => false,
                'message' =>
                    'Approval merchandise gagal diproses.',
                'data' =>
                    null,
            ], 500);
        }
    }

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
            $order =
                DB::transaction(
                    function () use (
                        $id,
                        $validated
                    ): Order {
                        $lockedOrder =
                            Order::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $id
                                );

                        if (
                            $lockedOrder->status !==
                            'pending'
                        ) {
                            $this->abortJson(
                                'Pengajuan hanya dapat ditolak saat status menunggu.',
                                422
                            );
                        }

                        $lockedOrder
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

                                'completed_at' =>
                                    null,
                            ]);

                        return $lockedOrder
                            ->fresh([
                                'user',
                                'items.product.category',
                                'revisionHistories.requestedBy',
                            ]);
                    }
                );

            return response()->json([
                'success' => true,
                'message' =>
                    'Pengajuan merchandise berhasil ditolak.',
                'data' =>
                    $order,
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
                'success' => false,
                'message' =>
                    'Penolakan pengajuan gagal diproses.',
                'data' =>
                    null,
            ], 500);
        }
    }

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

        $validated =
            $request->validate([
                'admin_note' => [
                    'nullable',
                    'string',
                    'max:2000',
                ],
            ]);

        try {
            $order =
                DB::transaction(
                    function () use (
                        $id,
                        $validated
                    ): Order {
                        $lockedOrder =
                            Order::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $id
                                );

                        if (
                            $lockedOrder->status !==
                            'approved'
                        ) {
                            $this->abortJson(
                                'Pengajuan hanya dapat diselesaikan setelah disetujui.',
                                422
                            );
                        }

                        $adminNote =
                            isset(
                                $validated[
                                    'admin_note'
                                ]
                            )
                                ? trim(
                                    $validated[
                                        'admin_note'
                                    ]
                                )
                                : $lockedOrder
                                    ->admin_note;

                        $lockedOrder
                            ->update([
                                'status' =>
                                    'completed',

                                'admin_note' =>
                                    $adminNote
                                        ?: null,

                                'completed_at' =>
                                    now(),
                            ]);

                        return $lockedOrder
                            ->fresh([
                                'user',
                                'items.product.category',
                                'revisionHistories.requestedBy',
                            ]);
                    }
                );

            return response()->json([
                'success' => true,
                'message' =>
                    'Pengajuan merchandise berhasil ditandai selesai.',
                'data' =>
                    $order,
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
                'success' => false,
                'message' =>
                    'Penyelesaian pengajuan gagal diproses.',
                'data' =>
                    null,
            ], 500);
        }
    }

    private function validateOrderRequest(
        Request $request,
        bool $proofFileRequired,
        ?Order $existingOrder = null
    ): array {
        $validated =
            $request->validate([
                'event_name' => [
                    'required',
                    'string',
                    'min:3',
                    'max:255',
                ],

                'pic_name' => [
                    'required',
                    'string',
                    'min:2',
                    'max:255',
                ],

                'pic_phone' => [
                    'required',
                    'string',
                    'min:8',
                    'max:30',
                    'regex:/^[0-9+\-\s().]+$/',
                ],

                'institution_name' => [
                    'required',
                    'string',
                    'min:2',
                    'max:255',
                ],

                'guest_name' => [
                    'required',
                    'string',
                    'min:2',
                    'max:255',
                ],

                'guest_position' => [
                    'required',
                    'string',
                    'min:2',
                    'max:255',
                ],

                'activity_date' => [
                    'required',
                    'date',
                ],

                'pickup_date' => [
                    'required',
                    'date',
                    'before_or_equal:activity_date',
                ],

                'user_note' => [
                    'required',
                    'string',
                    'min:5',
                    'max:5000',
                ],

                'proof_file' => [
                    $proofFileRequired
                        ? 'required'
                        : 'nullable',

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
                'event_name.required' =>
                    'Nama kegiatan wajib diisi.',

                'pic_name.required' =>
                    'Nama PIC wajib diisi.',

                'pic_name.min' =>
                    'Nama PIC minimal dua karakter.',

                'pic_phone.required' =>
                    'Nomor PIC wajib diisi.',

                'pic_phone.min' =>
                    'Nomor PIC minimal delapan karakter.',

                'pic_phone.regex' =>
                    'Format nomor PIC tidak valid.',

                'activity_date.required' =>
                    'Tanggal kegiatan wajib diisi.',

                'pickup_date.required' =>
                    'Tanggal pengambilan merchandise wajib diisi.',

                'pickup_date.before_or_equal' =>
                    'Tanggal pengambilan tidak boleh setelah tanggal kegiatan.',

                'proof_file.required' =>
                    'Dokumen pendukung wajib diunggah.',

                'proof_file.mimes' =>
                    'Lampiran harus berformat PDF, JPG, JPEG, atau PNG.',

                'proof_file.max' =>
                    'Ukuran lampiran maksimal 5 MB.',

                'items.required' =>
                    'Pilih minimal satu merchandise.',

                'items.min' =>
                    'Pilih minimal satu merchandise.',
            ]);

        $today =
            Carbon::today();

        $minimumActivityDate =
            $today
                ->copy()
                ->addDays(4);

        $activityDate =
            Carbon::parse(
                $validated[
                    'activity_date'
                ]
            )->startOfDay();

        $pickupDate =
            Carbon::parse(
                $validated[
                    'pickup_date'
                ]
            )->startOfDay();

        /*
         * Pengajuan baru wajib minimal H-4.
         *
         * Saat resubmit revisi, aturan H-4 hanya
         * diterapkan lagi apabila tanggal kegiatan
         * diubah oleh user.
         */
        $existingActivityDate =
            $existingOrder
                ?->activity_date
                ?->format(
                    'Y-m-d'
                );

        $activityDateChanged =
            !$existingOrder ||
            $existingActivityDate !==
                $activityDate
                    ->format(
                        'Y-m-d'
                    );

        if (
            $activityDateChanged &&
            $activityDate->lt(
                $minimumActivityDate
            )
        ) {
            $this->abortJson(
                'Pengajuan merchandise wajib dilakukan minimal H-4 sebelum tanggal kegiatan. Pilih tanggal kegiatan minimal ' .
                    $minimumActivityDate
                        ->locale(
                            'id'
                        )
                        ->translatedFormat(
                            'd F Y'
                        ) .
                    '.',
                422
            );
        }

        if (
            $pickupDate->gt(
                $activityDate
            )
        ) {
            $this->abortJson(
                'Tanggal pengambilan merchandise tidak boleh setelah tanggal kegiatan.',
                422
            );
        }

        /*
         * Pickup lama tetap boleh dipertahankan ketika
         * user hanya melakukan resubmit revisi.
         *
         * Tetapi jika pickup diubah, tanggal baru tidak
         * boleh berada di masa lalu.
         */
        $existingPickupDate =
            $existingOrder
                ?->pickup_date
                ?->format(
                    'Y-m-d'
                );

        $pickupDateChanged =
            !$existingOrder ||
            $existingPickupDate !==
                $pickupDate
                    ->format(
                        'Y-m-d'
                    );

        if (
            $pickupDateChanged &&
            $pickupDate->lt(
                $today
            )
        ) {
            $this->abortJson(
                'Tanggal pengambilan merchandise tidak boleh menggunakan tanggal yang sudah lewat.',
                422
            );
        }

        return $validated;
    }

    private function replaceOrderItems(
        Order $order,
        array $items
    ): void {
        $order
            ->items()
            ->delete();

        foreach (
            $items as
            $item
        ) {
            OrderItem::query()
                ->create([
                    'order_id' =>
                        $order->id,

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
    }

    private function canAccessOrder(
        Request $request,
        Order $order
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
                'approval.merchandise.view'
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
            (int) $order->user_id ===
            (int) $user->id
        );
    }

    private function canProcessOrder(
        Request $request
    ): bool {
        $user =
            $request->user();

        return (
            $user !== null &&
            $this->userHasPermission(
                $user,
                'approval.merchandise.process'
            )
        );
    }

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
            return $user
                ->hasPermission(
                    $permission
                );
        }

        $permissions =
            is_array(
                $user->permissions
            )
                ? $user->permissions
                : [];

        return in_array(
            $permission,
            $permissions,
            true
        );
    }

    private function validateOrderItems(
        array $items
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
                    "Produk {$product->name} tidak tersedia untuk merchandise.",
                    422
                );
            }

            if (
                (int) $product->stock <
                (int) $item[
                    'quantity'
                ]
            ) {
                $this->abortJson(
                    "Stok {$product->name} tidak mencukupi. Stok tersedia {$product->stock}.",
                    422
                );
            }
        }
    }

    private function generateOrderCode(): string
    {
        do {
            $orderCode =
                sprintf(
                    'MER-%s-%s',
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
            Order::query()
                ->where(
                    'order_code',
                    $orderCode
                )
                ->exists()
        );

        return $orderCode;
    }

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

    private function forbiddenResponse(
        string $message
    ): JsonResponse {
        return response()->json([
            'success' => false,
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