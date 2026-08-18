<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HumasServiceRequest;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class HumasServiceRequestController extends Controller
{
    private const UNIT_NAMES = [
        'TEKNIK TELEKOMUNIKASI',
        'TEKNIK ELEKTRO',
        'TEKNIK KOMPUTER',
        'TEKNIK INDUSTRI',
        'SISTEM INFORMASI',
        'TEKNIK LOGISTIK',
        'INFORMATIKA',
        'TEKNOLOGI INFORMASI',
        'REKAYASA PERANGKAT LUNAK',
        'SAINS DATA',
        'DIGITAL BISNIS',
        'KEMAHASISWAAN',
        'AKADEMIK',
        'KEUANGAN',
        'LOGISTIK',
        'PUTI',
        'ADMISI',
        'LPPM',
        'LABORATORIUM, PUSAT BAHASA & PERPUSTAKAAN',
        'SDM',
        'SPMP',
        'Lainnya',
    ];

    /*
     * Jenis layanan yang dapat dibuat untuk pengajuan BARU.
     *
     * SOCIAL MEDIA tidak lagi digunakan untuk pengajuan baru.
     * Record lama dengan value SOCIAL MEDIA tetap aman karena
     * data lama tidak diubah.
     */
    private const COVERAGE_TYPES = [
        'REQUEST DESIGN INSTAGRAM',
        'DOKUMENTASI',
        'PUBLIKASI WEBSITE',
        'PUBLIKASI MEDIA MASSA',
        'YOUTUBE',
        'VIDEO REELS',
    ];

    public function index(
        Request $request
    ): JsonResponse {
        $user =
            $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'approval.humas.view'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin melihat seluruh request layanan Humas.'
            );
        }

        $requests =
            HumasServiceRequest::query()
                ->with(
                    'user'
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
                'Data request layanan Humas berhasil diambil.',

            'data' =>
                $requests,
        ]);
    }

    public function myHumasServiceRequests(
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
                'Kamu tidak memiliki izin melihat riwayat request layanan Humas.'
            );
        }

        $requests =
            HumasServiceRequest::query()
                ->with(
                    'user'
                )
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
                'Riwayat request layanan Humas berhasil diambil.',

            'data' =>
                $requests,
        ]);
    }

    public function show(
        Request $request,
        int $id
    ): JsonResponse {
        $serviceRequest =
            HumasServiceRequest::query()
                ->with(
                    'user'
                )
                ->findOrFail(
                    $id
                );

        if (
            !$this->canAccessServiceRequest(
                $request,
                $serviceRequest
            )
        ) {
            return $this->forbiddenResponse(
                'Akses ditolak. Kamu tidak memiliki izin melihat request Humas ini.'
            );
        }

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Detail request layanan Humas berhasil diambil.',

            'data' =>
                $serviceRequest,
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
                'request.humas.create'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin membuat request layanan Humas.'
            );
        }

        $validated =
            $request->validate([
                'applicant_name' => [
                    'required',
                    'string',
                    'min:3',
                    'max:255',
                ],

                'unit_name' => [
                    'required',

                    Rule::in(
                        self::UNIT_NAMES
                    ),
                ],

                'other_unit_name' => [
                    'nullable',
                    'required_if:unit_name,Lainnya',
                    'string',
                    'max:255',
                ],

                'pic_whatsapp' => [
                    'required',
                    'string',
                    'min:9',
                    'max:30',
                    'regex:/^[0-9+\-\s()]+$/',
                ],

                'activity_detail' => [
                    'required',
                    'string',
                    'min:10',
                    'max:10000',
                ],

                'coverage_type' => [
                    'required',

                    Rule::in(
                        self::COVERAGE_TYPES
                    ),
                ],

                'event_location' => [
                    'required',
                    'string',
                    'min:3',
                    'max:255',
                ],

                'event_date' => [
                    'required',
                    'date',
                ],

                'reference_link' => [
                    'nullable',
                    'url',
                    'max:2000',
                ],

                /*
                 * Nama field tetap article_draft agar kompatibel
                 * dengan struktur database lama.
                 *
                 * Secara bisnis sekarang disebut Lampiran / Brief.
                 */
                'article_draft' => [
                    'required',
                    'file',
                    'mimes:pdf,doc,docx,jpg,jpeg,png',
                    'max:10240',
                ],
            ], [
                'applicant_name.required' =>
                    'Nama lengkap pemohon wajib diisi.',

                'applicant_name.min' =>
                    'Nama lengkap pemohon minimal tiga karakter.',

                'unit_name.required' =>
                    'Nama unit atau program studi wajib dipilih.',

                'unit_name.in' =>
                    'Nama unit atau program studi tidak valid.',

                'other_unit_name.required_if' =>
                    'Nama unit lainnya wajib diisi.',

                'pic_whatsapp.required' =>
                    'Kontak WhatsApp PIC acara wajib diisi.',

                'pic_whatsapp.regex' =>
                    'Format nomor WhatsApp PIC tidak valid.',

                'activity_detail.required' =>
                    'Detail kegiatan wajib diisi.',

                'activity_detail.min' =>
                    'Detail kegiatan minimal sepuluh karakter.',

                'coverage_type.required' =>
                    'Jenis layanan Humas wajib dipilih.',

                'coverage_type.in' =>
                    'Jenis layanan Humas tidak valid.',

                'event_location.required' =>
                    'Lokasi acara wajib diisi.',

                'event_date.required' =>
                    'Tanggal pelaksanaan kegiatan wajib diisi.',

                'reference_link.url' =>
                    'Link bahan atau referensi harus berupa URL yang valid.',

                'article_draft.required' =>
                    'Lampiran atau brief kegiatan wajib diunggah.',

                'article_draft.mimes' =>
                    'Lampiran harus berformat PDF, DOC, DOCX, JPG, JPEG, atau PNG.',

                'article_draft.max' =>
                    'Ukuran lampiran maksimal 10 MB.',
            ]);

        $articleDraftPath =
            null;

        try {
            $articleDraft =
                $request->file(
                    'article_draft'
                );

            $articleDraftPath =
                $articleDraft->store(
                    'humas-article-drafts',
                    'public'
                );

            $serviceRequest =
                DB::transaction(
                    function () use (
                        $user,
                        $validated,
                        $articleDraft,
                        $articleDraftPath
                    ): HumasServiceRequest {
                        return HumasServiceRequest::query()
                            ->create([
                                'user_id' =>
                                    $user->id,

                                'service_code' =>
                                    $this->generateServiceCode(),

                                'applicant_name' =>
                                    trim(
                                        $validated[
                                            'applicant_name'
                                        ]
                                    ),

                                'unit_name' =>
                                    $validated[
                                        'unit_name'
                                    ],

                                'other_unit_name' =>
                                    $validated[
                                        'unit_name'
                                    ] ===
                                    'Lainnya'
                                        ? trim(
                                            $validated[
                                                'other_unit_name'
                                            ]
                                        )
                                        : null,

                                'pic_whatsapp' =>
                                    trim(
                                        $validated[
                                            'pic_whatsapp'
                                        ]
                                    ),

                                'activity_detail' =>
                                    trim(
                                        $validated[
                                            'activity_detail'
                                        ]
                                    ),

                                'coverage_type' =>
                                    $validated[
                                        'coverage_type'
                                    ],

                                'event_location' =>
                                    trim(
                                        $validated[
                                            'event_location'
                                        ]
                                    ),

                                'event_date' =>
                                    $validated[
                                        'event_date'
                                    ],

                                'reference_link' =>
                                    !empty(
                                        $validated[
                                            'reference_link'
                                        ] ?? null
                                    )
                                        ? trim(
                                            $validated[
                                                'reference_link'
                                            ]
                                        )
                                        : null,

                                'article_draft_path' =>
                                    $articleDraftPath,

                                'article_draft_name' =>
                                    $articleDraft
                                        ->getClientOriginalName(),

                                'article_draft_mime' =>
                                    $articleDraft
                                        ->getMimeType(),

                                'result_link' =>
                                    null,

                                'result_file_path' =>
                                    null,

                                'result_file_name' =>
                                    null,

                                'result_file_mime' =>
                                    null,

                                'result_note' =>
                                    null,

                                'status' =>
                                    'pending',

                                'admin_note' =>
                                    null,

                                'submitted_at' =>
                                    now(),

                                'approved_at' =>
                                    null,

                                'rejected_at' =>
                                    null,

                                'completed_at' =>
                                    null,
                            ]);
                    }
                );

            $serviceRequest
                ->load(
                    'user'
                );

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Request layanan Humas berhasil dikirim.',

                'data' =>
                    $serviceRequest,
            ], 201);
        } catch (
            HttpResponseException $error
        ) {
            $this->deleteFileIfExists(
                $articleDraftPath
            );

            throw $error;
        } catch (
            Throwable $error
        ) {
            $this->deleteFileIfExists(
                $articleDraftPath
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
                        : 'Request layanan Humas gagal dikirim.',

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
            !$this->canProcessServiceRequest(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin menyetujui request Humas.'
            );
        }

        try {
            $serviceRequest =
                DB::transaction(
                    function () use (
                        $id
                    ): HumasServiceRequest {
                        $lockedRequest =
                            HumasServiceRequest::query()
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
                                'Request hanya bisa disetujui saat status masih menunggu.',
                                422
                            );
                        }

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

                                'completed_at' =>
                                    null,

                                'result_link' =>
                                    null,

                                'result_file_path' =>
                                    null,

                                'result_file_name' =>
                                    null,

                                'result_file_mime' =>
                                    null,

                                'result_note' =>
                                    null,
                            ]);

                        return $lockedRequest
                            ->fresh(
                                'user'
                            );
                    }
                );

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Request Humas berhasil disetujui.',

                'data' =>
                    $serviceRequest,
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
                    'Approval request Humas gagal diproses.',

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
            !$this->canProcessServiceRequest(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin menolak request Humas.'
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
            $serviceRequest =
                DB::transaction(
                    function () use (
                        $id,
                        $validated
                    ): HumasServiceRequest {
                        $lockedRequest =
                            HumasServiceRequest::query()
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
                                'Request hanya bisa ditolak saat status masih menunggu.',
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

                                'completed_at' =>
                                    null,

                                'result_link' =>
                                    null,

                                'result_file_path' =>
                                    null,

                                'result_file_name' =>
                                    null,

                                'result_file_mime' =>
                                    null,

                                'result_note' =>
                                    null,
                            ]);

                        return $lockedRequest
                            ->fresh(
                                'user'
                            );
                    }
                );

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Request Humas berhasil ditolak.',

                'data' =>
                    $serviceRequest,
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
                    'Penolakan request Humas gagal diproses.',

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
            !$this->canProcessServiceRequest(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin menyelesaikan request Humas.'
            );
        }

        $validated =
            $request->validate([
                'result_link' => [
                    'nullable',
                    'url',
                    'max:2000',
                    'required_without:result_file',
                ],

                'result_file' => [
                    'nullable',
                    'file',
                    'mimes:pdf,doc,docx,jpg,jpeg,png,zip',
                    'max:20480',
                    'required_without:result_link',
                ],

                'result_note' => [
                    'nullable',
                    'string',
                    'max:3000',
                ],
            ], [
                'result_link.required_without' =>
                    'Masukkan link hasil atau unggah file hasil pekerjaan.',

                'result_link.url' =>
                    'Link hasil pekerjaan harus berupa URL yang valid.',

                'result_link.max' =>
                    'Link hasil pekerjaan maksimal 2.000 karakter.',

                'result_file.required_without' =>
                    'Unggah file hasil atau masukkan link hasil pekerjaan.',

                'result_file.file' =>
                    'File hasil tidak valid.',

                'result_file.mimes' =>
                    'File hasil harus berformat PDF, DOC, DOCX, JPG, JPEG, PNG, atau ZIP.',

                'result_file.max' =>
                    'Ukuran file hasil maksimal 20 MB.',

                'result_note.max' =>
                    'Catatan hasil maksimal 3.000 karakter.',
            ]);

        $resultFilePath =
            null;

        try {
            $resultFile =
                $request->file(
                    'result_file'
                );

            if (
                $resultFile
            ) {
                $resultFilePath =
                    $resultFile->store(
                        'humas-results',
                        'public'
                    );
            }

            $serviceRequest =
                DB::transaction(
                    function () use (
                        $id,
                        $validated,
                        $resultFile,
                        $resultFilePath
                    ): HumasServiceRequest {
                        $lockedRequest =
                            HumasServiceRequest::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $id
                                );

                        if (
                            $lockedRequest
                                ->status !==
                            'approved'
                        ) {
                            $this->abortJson(
                                'Request hanya bisa diselesaikan setelah disetujui.',
                                422
                            );
                        }

                        $resultLink =
                            !empty(
                                $validated[
                                    'result_link'
                                ] ?? null
                            )
                                ? trim(
                                    $validated[
                                        'result_link'
                                    ]
                                )
                                : null;

                        $resultNote =
                            !empty(
                                $validated[
                                    'result_note'
                                ] ?? null
                            )
                                ? trim(
                                    $validated[
                                        'result_note'
                                    ]
                                )
                                : null;

                        $lockedRequest
                            ->update([
                                'status' =>
                                    'completed',

                                'result_link' =>
                                    $resultLink,

                                'result_file_path' =>
                                    $resultFilePath,

                                'result_file_name' =>
                                    $resultFile
                                        ? $resultFile
                                            ->getClientOriginalName()
                                        : null,

                                'result_file_mime' =>
                                    $resultFile
                                        ? $resultFile
                                            ->getMimeType()
                                        : null,

                                'result_note' =>
                                    $resultNote,

                                'completed_at' =>
                                    now(),
                            ]);

                        return $lockedRequest
                            ->fresh(
                                'user'
                            );
                    }
                );

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Request Humas berhasil diselesaikan dan hasil pekerjaan telah disimpan.',

                'data' =>
                    $serviceRequest,
            ]);
        } catch (
            HttpResponseException $error
        ) {
            $this->deleteFileIfExists(
                $resultFilePath
            );

            throw $error;
        } catch (
            Throwable $error
        ) {
            $this->deleteFileIfExists(
                $resultFilePath
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
                        : 'Penyelesaian request Humas gagal diproses.',

                'data' =>
                    null,
            ], 500);
        }
    }

    private function canAccessServiceRequest(
        Request $request,
        HumasServiceRequest $serviceRequest
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
                'approval.humas.view'
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
                $serviceRequest
                    ->user_id ===
            (int)
                $user->id
        );
    }

    private function canProcessServiceRequest(
        Request $request
    ): bool {
        $user =
            $request->user();

        return (
            $user !==
                null &&
            $this->userHasPermission(
                $user,
                'approval.humas.process'
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

    private function generateServiceCode(): string
    {
        do {
            $code =
                sprintf(
                    'LIP-%s-%s',
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
            HumasServiceRequest::query()
                ->where(
                    'service_code',
                    $code
                )
                ->exists()
        );

        return $code;
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