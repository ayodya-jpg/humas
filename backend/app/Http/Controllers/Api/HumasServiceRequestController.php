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

    private const COVERAGE_TYPES = [
        'SOCIAL MEDIA',
        'DOKUMENTASI',
        'PUBLIKASI WEBSITE',
        'YOUTUBE',
        'VIDEO REELS',
    ];

    /**
     * Menampilkan seluruh request liputan Humas.
     *
     * Endpoint ini hanya boleh diakses oleh akun yang memiliki
     * permission approval.humas.view.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'approval.humas.view'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin melihat seluruh request liputan Humas.'
            );
        }

        $requests = HumasServiceRequest::query()
            ->with('user')
            ->latest('submitted_at')
            ->latest('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data request liputan Humas berhasil diambil.',
            'data' => $requests,
        ]);
    }

    /**
     * Menampilkan request liputan milik user login.
     */
    public function myHumasServiceRequests(
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
                'Kamu tidak memiliki izin melihat riwayat request liputan Humas.'
            );
        }

        $requests = HumasServiceRequest::query()
            ->with('user')
            ->where(
                'user_id',
                $user->id
            )
            ->latest('submitted_at')
            ->latest('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat request liputan Humas berhasil diambil.',
            'data' => $requests,
        ]);
    }

    /**
     * Menampilkan detail request liputan.
     *
     * Aturan:
     * - superadmin dapat melihat seluruh request;
     * - approval.humas.view dapat melihat seluruh request;
     * - request.history.view hanya dapat melihat request miliknya;
     * - akun lain mendapatkan response 403.
     */
    public function show(
        Request $request,
        int $id
    ): JsonResponse {
        $serviceRequest = HumasServiceRequest::query()
            ->with('user')
            ->findOrFail($id);

        if (
            !$this->canAccessServiceRequest(
                $request,
                $serviceRequest
            )
        ) {
            return $this->forbiddenResponse(
                'Akses ditolak. Kamu tidak memiliki izin melihat request liputan ini.'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail request liputan Humas berhasil diambil.',
            'data' => $serviceRequest,
        ]);
    }

    /**
     * Menyimpan request liputan Humas baru.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            !$user ||
            !$this->userHasPermission(
                $user,
                'request.humas.create'
            )
        ) {
            return $this->forbiddenResponse(
                'Kamu tidak memiliki izin membuat request liputan Humas.'
            );
        }

        $validated = $request->validate([
            'applicant_name' => [
                'required',
                'string',
                'min:3',
                'max:255',
            ],

            'unit_name' => [
                'required',
                Rule::in(self::UNIT_NAMES),
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
                Rule::in(self::COVERAGE_TYPES),
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

            'article_draft' => [
                'required',
                'file',
                'mimes:pdf,doc,docx',
                'max:10240',
            ],
        ], [
            'applicant_name.required' => 'Nama lengkap pemohon wajib diisi.',
            'applicant_name.min' => 'Nama lengkap pemohon minimal tiga karakter.',
            'applicant_name.max' => 'Nama lengkap pemohon maksimal 255 karakter.',

            'unit_name.required' => 'Nama unit atau program studi wajib dipilih.',
            'unit_name.in' => 'Nama unit atau program studi tidak valid.',

            'other_unit_name.required_if' => 'Nama unit lainnya wajib diisi.',
            'other_unit_name.max' => 'Nama unit lainnya maksimal 255 karakter.',

            'pic_whatsapp.required' => 'Kontak WhatsApp PIC acara wajib diisi.',
            'pic_whatsapp.min' => 'Nomor WhatsApp PIC terlalu pendek.',
            'pic_whatsapp.max' => 'Nomor WhatsApp PIC terlalu panjang.',
            'pic_whatsapp.regex' => 'Format nomor WhatsApp PIC tidak valid.',

            'activity_detail.required' => 'Detail kegiatan wajib diisi.',
            'activity_detail.min' => 'Detail kegiatan minimal sepuluh karakter.',
            'activity_detail.max' => 'Detail kegiatan maksimal 10.000 karakter.',

            'coverage_type.required' => 'Jenis liputan wajib dipilih.',
            'coverage_type.in' => 'Jenis liputan tidak valid.',

            'event_location.required' => 'Lokasi acara wajib diisi.',
            'event_location.min' => 'Lokasi acara minimal tiga karakter.',
            'event_location.max' => 'Lokasi acara maksimal 255 karakter.',

            'event_date.required' => 'Tanggal pelaksanaan kegiatan wajib diisi.',
            'event_date.date' => 'Format tanggal pelaksanaan tidak valid.',

            'reference_link.url' => 'Link bahan atau referensi harus berupa URL yang valid.',
            'reference_link.max' => 'Link bahan atau referensi maksimal 2.000 karakter.',

            'article_draft.required' => 'Draft artikel kegiatan wajib diunggah.',
            'article_draft.file' => 'Draft artikel harus berupa file.',
            'article_draft.mimes' => 'Draft artikel harus berformat PDF, DOC, atau DOCX.',
            'article_draft.max' => 'Ukuran draft artikel maksimal 10 MB.',
        ]);

        $articleDraftPath = null;

        try {
            $articleDraft = $request->file(
                'article_draft'
            );

            $articleDraftPath = $articleDraft->store(
                'humas-article-drafts',
                'public'
            );

            $serviceRequest = DB::transaction(
                function () use (
                    $user,
                    $validated,
                    $articleDraft,
                    $articleDraftPath
                ): HumasServiceRequest {
                    return HumasServiceRequest::query()->create([
                        'user_id' => $user->id,
                        'service_code' => $this->generateServiceCode(),

                        'applicant_name' => trim(
                            $validated['applicant_name']
                        ),

                        'unit_name' => $validated['unit_name'],

                        'other_unit_name' =>
                            $validated['unit_name'] === 'Lainnya'
                                ? trim(
                                    $validated['other_unit_name']
                                )
                                : null,

                        'pic_whatsapp' => trim(
                            $validated['pic_whatsapp']
                        ),

                        'activity_detail' => trim(
                            $validated['activity_detail']
                        ),

                        'coverage_type' => $validated['coverage_type'],

                        'event_location' => trim(
                            $validated['event_location']
                        ),

                        'event_date' => $validated['event_date'],

                        'reference_link' =>
                            isset($validated['reference_link']) &&
                            trim($validated['reference_link']) !== ''
                                ? trim(
                                    $validated['reference_link']
                                )
                                : null,

                        'article_draft_path' => $articleDraftPath,
                        'article_draft_name' => $articleDraft->getClientOriginalName(),
                        'article_draft_mime' => $articleDraft->getMimeType(),

                        'result_link' => null,
                        'result_note' => null,

                        'status' => 'pending',
                        'admin_note' => null,

                        'submitted_at' => now(),
                        'approved_at' => null,
                        'rejected_at' => null,
                        'completed_at' => null,
                    ]);
                }
            );

            $serviceRequest->load('user');

            return response()->json([
                'success' => true,
                'message' => 'Request liputan Humas berhasil dikirim.',
                'data' => $serviceRequest,
            ], 201);
        } catch (HttpResponseException $error) {
            $this->deleteFileIfExists(
                $articleDraftPath
            );

            throw $error;
        } catch (Throwable $error) {
            $this->deleteFileIfExists(
                $articleDraftPath
            );

            report($error);

            return response()->json([
                'success' => false,
                'message' => app()->isLocal()
                    ? $error->getMessage()
                    : 'Request liputan Humas gagal dikirim.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Menyetujui request liputan.
     */
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
                'Kamu tidak memiliki izin menyetujui request liputan Humas.'
            );
        }

        try {
            $serviceRequest = DB::transaction(
                function () use ($id): HumasServiceRequest {
                    $lockedRequest = HumasServiceRequest::query()
                        ->lockForUpdate()
                        ->findOrFail($id);

                    if (
                        $lockedRequest->status !==
                        'pending'
                    ) {
                        $this->abortJson(
                            'Request hanya bisa disetujui saat status masih menunggu.',
                            422
                        );
                    }

                    $lockedRequest->update([
                        'status' => 'approved',
                        'admin_note' => null,

                        'approved_at' => now(),
                        'rejected_at' => null,
                        'completed_at' => null,

                        'result_link' => null,
                        'result_note' => null,
                    ]);

                    return $lockedRequest->fresh(
                        'user'
                    );
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Request liputan Humas berhasil disetujui.',
                'data' => $serviceRequest,
            ]);
        } catch (HttpResponseException $error) {
            throw $error;
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Approval request liputan gagal diproses.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Menolak request liputan.
     */
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
                'Kamu tidak memiliki izin menolak request liputan Humas.'
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
            $serviceRequest = DB::transaction(
                function () use (
                    $id,
                    $validated
                ): HumasServiceRequest {
                    $lockedRequest = HumasServiceRequest::query()
                        ->lockForUpdate()
                        ->findOrFail($id);

                    if (
                        $lockedRequest->status !==
                        'pending'
                    ) {
                        $this->abortJson(
                            'Request hanya bisa ditolak saat status masih menunggu.',
                            422
                        );
                    }

                    $lockedRequest->update([
                        'status' => 'rejected',

                        'admin_note' => trim(
                            $validated['admin_note']
                        ),

                        'rejected_at' => now(),
                        'approved_at' => null,
                        'completed_at' => null,

                        'result_link' => null,
                        'result_note' => null,
                    ]);

                    return $lockedRequest->fresh(
                        'user'
                    );
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Request liputan Humas berhasil ditolak.',
                'data' => $serviceRequest,
            ]);
        } catch (HttpResponseException $error) {
            throw $error;
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Penolakan request liputan gagal diproses.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Menyelesaikan request dan menyimpan link hasil pekerjaan.
     */
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
                'Kamu tidak memiliki izin menyelesaikan request liputan Humas.'
            );
        }

        $validated = $request->validate([
            'result_link' => [
                'required',
                'url',
                'max:2000',
            ],

            'result_note' => [
                'nullable',
                'string',
                'max:3000',
            ],
        ], [
            'result_link.required' => 'Link hasil pekerjaan wajib diisi.',
            'result_link.url' => 'Link hasil pekerjaan harus berupa URL yang valid.',
            'result_link.max' => 'Link hasil pekerjaan maksimal 2.000 karakter.',

            'result_note.string' => 'Catatan hasil harus berupa teks.',
            'result_note.max' => 'Catatan hasil maksimal 3.000 karakter.',
        ]);

        try {
            $serviceRequest = DB::transaction(
                function () use (
                    $id,
                    $validated
                ): HumasServiceRequest {
                    $lockedRequest = HumasServiceRequest::query()
                        ->lockForUpdate()
                        ->findOrFail($id);

                    if (
                        $lockedRequest->status !==
                        'approved'
                    ) {
                        $this->abortJson(
                            'Request hanya bisa diselesaikan setelah disetujui.',
                            422
                        );
                    }

                    $lockedRequest->update([
                        'status' => 'completed',

                        'result_link' => trim(
                            $validated['result_link']
                        ),

                        'result_note' =>
                            isset($validated['result_note']) &&
                            trim($validated['result_note']) !== ''
                                ? trim(
                                    $validated['result_note']
                                )
                                : null,

                        'completed_at' => now(),
                    ]);

                    return $lockedRequest->fresh(
                        'user'
                    );
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Request liputan berhasil diselesaikan dan link hasil telah disimpan.',
                'data' => $serviceRequest,
            ]);
        } catch (HttpResponseException $error) {
            throw $error;
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Penyelesaian request liputan gagal diproses.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Memeriksa akses detail request.
     */
    private function canAccessServiceRequest(
        Request $request,
        HumasServiceRequest $serviceRequest
    ): bool {
        $user = $request->user();

        if (!$user) {
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
            (int) $serviceRequest->user_id ===
            (int) $user->id
        );
    }

    /**
     * Memeriksa permission proses approval Humas.
     */
    private function canProcessServiceRequest(
        Request $request
    ): bool {
        $user = $request->user();

        return (
            $user !== null &&
            $this->userHasPermission(
                $user,
                'approval.humas.process'
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
     * Membuat kode request unik.
     */
    private function generateServiceCode(): string
    {
        do {
            $code = sprintf(
                'LIP-%s-%s',
                now()->format(
                    'YmdHis'
                ),
                strtoupper(
                    Str::random(5)
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

    /**
     * Menghapus file apabila penyimpanan database gagal.
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