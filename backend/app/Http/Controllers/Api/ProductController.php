<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class ProductController extends Controller
{
    private const MAX_GALLERY_IMAGES = 8;

    /*
    |--------------------------------------------------------------------------
    | DAFTAR PRODUK
    |--------------------------------------------------------------------------
    */

    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Daftar produk berhasil diambil.',
            'data' => Product::with('category:id,name,slug,status')
                ->latest('created_at')
                ->get(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | DETAIL PRODUK
    |--------------------------------------------------------------------------
    */

    public function show(Product $product): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Detail produk berhasil diambil.',
            'data' => $product->load('category:id,name,slug,status'),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDASI PRODUK
    |--------------------------------------------------------------------------
    */

    private function rules(?Product $product = null): array
    {
        return [
            'category_id' => [
                'required',
                'integer',
                'exists:categories,id',
            ],

            'name' => [
                'required',
                'string',
                'min:3',
                'max:255',
            ],

            'slug' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                $product
                    ? Rule::unique('products', 'slug')->ignore($product->id)
                    : Rule::unique('products', 'slug'),
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'stock' => [
                'required',
                'integer',
                'min:0',
            ],

            'type' => [
                'required',
                Rule::in(['checkout', 'borrow', 'both']),
            ],

            'sekpim_item_type' => [
                'sometimes',
                'nullable',
                Rule::in(['borrow', 'asset_request', 'both']),
            ],

            /*
            | Foto utama produk
            */

            'image_file' => [
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],

            'remove_image' => [
                'sometimes',
                'boolean',
            ],

            /*
            | Foto tambahan produk
            |
            | Dikirim melalui FormData:
            | gallery_files[]
            */

            'gallery_files' => [
                'sometimes',
                'array',
                'max:' . self::MAX_GALLERY_IMAGES,
            ],

            'gallery_files.*' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],

            /*
            | URL foto galeri yang ingin dihapus.
            |
            | Dikirim melalui FormData:
            | remove_gallery_images[]
            */

            'remove_gallery_images' => [
                'sometimes',
                'array',
                'max:' . self::MAX_GALLERY_IMAGES,
            ],

            'remove_gallery_images.*' => [
                'required',
                'string',
                'max:2048',
                'distinct',
            ],

            'status' => [
                'required',
                Rule::in(['active', 'inactive']),
            ],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | PESAN VALIDASI
    |--------------------------------------------------------------------------
    */

    private function messages(): array
    {
        return [
            'image_file.mimes' =>
                'Foto utama harus JPG, JPEG, PNG, atau WEBP.',

            'image_file.max' =>
                'Ukuran foto utama maksimal 5 MB.',

            'image_file.file' =>
                'Berkas foto utama tidak valid.',

            'gallery_files.array' =>
                'Foto tambahan harus dikirim sebagai daftar file.',

            'gallery_files.max' =>
                'Maksimal 8 foto tambahan untuk setiap produk.',

            'gallery_files.*.file' =>
                'Salah satu foto tambahan bukan berkas yang valid.',

            'gallery_files.*.mimes' =>
                'Foto tambahan harus JPG, JPEG, PNG, atau WEBP.',

            'gallery_files.*.max' =>
                'Ukuran setiap foto tambahan maksimal 5 MB.',

            'remove_gallery_images.array' =>
                'Daftar foto yang dihapus tidak valid.',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | DATA PRODUK
    |--------------------------------------------------------------------------
    */

    private function productData(
        array $data,
        ?Product $product = null
    ): array {
        $type = $data['type'];

        $sekpimType = array_key_exists('sekpim_item_type', $data)
            ? $data['sekpim_item_type']
            : $product?->sekpim_item_type;

        if ($type === 'checkout') {
            $sekpimType = null;
        } elseif (!$product && !$sekpimType) {
            $sekpimType = 'borrow';
        }

        return [
            'category_id' => (int) $data['category_id'],

            'name' => trim($data['name']),

            'description' => isset($data['description'])
                ? trim($data['description'])
                : null,

            'stock' => (int) $data['stock'],

            'type' => $type,

            'sekpim_item_type' => $sekpimType,

            'status' => $data['status'],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | UPLOAD GAMBAR
    |--------------------------------------------------------------------------
    |
    | Semua gambar disimpan pada:
    | storage/app/public/products
    |
    | Foto utama dan galeri menggunakan disk public Laravel.
    */

    private function uploadImage(Request $request): ?string
    {
        if (!$request->hasFile('image_file')) {
            return null;
        }

        $path = $request->file('image_file')->store(
            'products',
            'public'
        );

        if (!$path) {
            throw new RuntimeException(
                'Gagal menyimpan foto utama produk.'
            );
        }

        return $path;
    }

    /*
    |--------------------------------------------------------------------------
    | UPLOAD FOTO TAMBAHAN
    |--------------------------------------------------------------------------
    |
    | $uploadedPaths menyimpan daftar file baru.
    | File baru dibersihkan jika transaksi database gagal.
    */

    private function uploadGalleryImages(
        Request $request,
        array &$uploadedPaths
    ): array {
        $urls = [];

        foreach ($request->file('gallery_files', []) as $file) {
            $path = $file->store(
                'products',
                'public'
            );

            if (!$path) {
                throw new RuntimeException(
                    'Gagal menyimpan salah satu foto tambahan.'
                );
            }

            $uploadedPaths[] = $path;

            $urls[] = Storage::disk('public')->url(
                $path
            );
        }

        return $urls;
    }

    /*
    |--------------------------------------------------------------------------
    | AMBIL FOTO GALERI LAMA
    |--------------------------------------------------------------------------
    */

    private function galleryImages(Product $product): array
    {
        $images = $product->gallery_images;

        if (!is_array($images)) {
            return [];
        }

        return array_values(
            array_unique(
                array_filter(
                    $images,
                    fn ($url) =>
                        is_string($url) &&
                        trim($url) !== ''
                )
            )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDASI JUMLAH FOTO GALERI
    |--------------------------------------------------------------------------
    |
    | Maksimal 8 foto tambahan dalam kondisi akhir.
    |
    | Contoh:
    | - Foto lama: 5
    | - Dihapus: 2
    | - Ditambah: 3
    | - Hasil akhir: 6 foto
    |
    | URL yang dihapus harus termasuk milik produk tersebut.
    */

    private function prepareGallery(
        Request $request,
        array $existingImages = []
    ): array {
        $removeUrls = $request->input(
            'remove_gallery_images',
            []
        );

        $removeUrls = is_array($removeUrls)
            ? $removeUrls
            : [];

        $unknownUrls = array_diff(
            $removeUrls,
            $existingImages
        );

        if (!empty($unknownUrls)) {
            throw ValidationException::withMessages([
                'remove_gallery_images' =>
                    'Foto yang hendak dihapus tidak ditemukan pada produk ini.',
            ]);
        }

        $remaining = array_values(
            array_filter(
                $existingImages,
                fn ($url) =>
                    !in_array($url, $removeUrls, true)
            )
        );

        $newFiles = $request->file(
            'gallery_files',
            []
        );

        $newCount = is_array($newFiles)
            ? count($newFiles)
            : 0;

        if (
            count($remaining) + $newCount >
            self::MAX_GALLERY_IMAGES
        ) {
            throw ValidationException::withMessages([
                'gallery_files' =>
                    'Total foto tambahan maksimal 8. Hapus beberapa foto lama sebelum menambahkan foto baru.',
            ]);
        }

        return $remaining;
    }

    /*
    |--------------------------------------------------------------------------
    | IDENTIFIKASI FOTO LOKAL
    |--------------------------------------------------------------------------
    |
    | Gambar dari URL eksternal tidak boleh ikut dihapus.
    | Hanya file /storage/products/... yang bisa dibersihkan.
    */

    private function localImagePath(?string $image): ?string
    {
        if (!$image) {
            return null;
        }

        $host = parse_url(
            $image,
            PHP_URL_HOST
        );

        $appHost = parse_url(
            config('app.url'),
            PHP_URL_HOST
        );

        if (
            $host &&
            $appHost &&
            strcasecmp($host, $appHost) !== 0
        ) {
            return null;
        }

        $path = parse_url(
            $image,
            PHP_URL_PATH
        );

        if (
            !is_string($path) ||
            !preg_match(
                '~^/storage/products/([A-Za-z0-9._-]+)$~',
                $path,
                $match
            )
        ) {
            return null;
        }

        return 'products/' . $match[1];
    }

    /*
    |--------------------------------------------------------------------------
    | BERSIHKAN FILE BARU JIKA GAGAL
    |--------------------------------------------------------------------------
    */

    private function deleteUploadedFiles(array $paths): void
    {
        foreach (array_unique($paths) as $path) {
            try {
                Storage::disk('public')->delete(
                    $path
                );
            } catch (Throwable $error) {
                report($error);
            }
        }
    }

    /*
    |--------------------------------------------------------------------------
    | HAPUS FILE YANG SUDAH TIDAK DIGUNAKAN
    |--------------------------------------------------------------------------
    |
    | File hanya dihapus jika URL tersebut tidak lagi
    | dipakai sebagai foto utama ataupun foto galeri.
    */

    private function deleteRemovedImages(
        array $oldUrls,
        array $retainedUrls
    ): void {
        $retainedPaths = array_values(
            array_filter(
                array_map(
                    fn ($url) =>
                        $this->localImagePath($url),
                    $retainedUrls
                )
            )
        );

        $deletedPaths = [];

        foreach ($oldUrls as $url) {
            $path = $this->localImagePath(
                $url
            );

            if (
                !$path ||
                in_array($path, $retainedPaths, true) ||
                in_array($path, $deletedPaths, true)
            ) {
                continue;
            }

            $deletedPaths[] = $path;
        }

        $this->deleteUploadedFiles(
            $deletedPaths
        );
    }

    /*
    |--------------------------------------------------------------------------
    | TAMBAH PRODUK
    |--------------------------------------------------------------------------
    */

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(
            $this->rules(),
            $this->messages()
        );

        $this->prepareGallery($request);

        $slug = $this->uniqueSlug(
            $validated['slug'] ?? $validated['name']
        );

        $uploadedPaths = [];

        try {
            /*
            | Upload foto utama.
            */

            $mainPath = $this->uploadImage(
                $request
            );

            if ($mainPath) {
                $uploadedPaths[] = $mainPath;
            }

            /*
            | Upload foto galeri.
            */

            $galleryUrls = $this->uploadGalleryImages(
                $request,
                $uploadedPaths
            );

            $mainUrl = $mainPath
                ? Storage::disk('public')->url($mainPath)
                : null;

            /*
            | Simpan data ke database.
            */

            $product = DB::transaction(
                function () use (
                    $validated,
                    $slug,
                    $mainUrl,
                    $galleryUrls
                ): Product {
                    return Product::create([
                        ...$this->productData($validated),

                        'slug' => $slug,

                        'image' => $mainUrl,

                        'gallery_images' => $galleryUrls,
                    ]);
                }
            );

            return response()->json([
                'success' => true,

                'message' =>
                    'Produk berhasil ditambahkan.',

                'data' => $product->load(
                    'category:id,name,slug,status'
                ),
            ], 201);
        } catch (Throwable $error) {
            $this->deleteUploadedFiles(
                $uploadedPaths
            );

            report($error);

            return response()->json([
                'success' => false,
                'message' =>
                    'Produk gagal ditambahkan.',
                'data' => null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | EDIT PRODUK
    |--------------------------------------------------------------------------
    |
    | Foto utama dan galeri dikelola secara terpisah.
    |
    | Foto lama tetap dipertahankan jika admin
    | tidak memilih untuk mengganti atau menghapusnya.
    */

    public function update(
        Request $request,
        Product $product
    ): JsonResponse {
        $validated = $request->validate(
            $this->rules($product),
            $this->messages()
        );

        /*
        | Ambil foto galeri sebelumnya.
        */

        $existingGallery = $this->galleryImages(
            $product
        );

        /*
        | Hitung galeri yang akan dipertahankan.
        */

        $remainingGallery = $this->prepareGallery(
            $request,
            $existingGallery
        );

        $slug = !empty($validated['slug'])
            ? Str::slug($validated['slug'])
            : $product->slug;

        $oldMainUrl = $product->image;

        $removeMainImage = $request->boolean(
            'remove_image'
        );

        $uploadedPaths = [];

        try {
            /*
            | Upload foto utama baru jika ada.
            */

            $newMainPath = $this->uploadImage(
                $request
            );

            if ($newMainPath) {
                $uploadedPaths[] = $newMainPath;
            }

            /*
            | Tambahkan foto galeri baru.
            */

            $addedGallery = $this->uploadGalleryImages(
                $request,
                $uploadedPaths
            );

            /*
            | Gabungkan foto lama yang dipertahankan
            | dengan foto baru.
            */

            $finalGallery = array_values(
                array_merge(
                    $remainingGallery,
                    $addedGallery
                )
            );

            /*
            | Foto utama:
            | - Ada upload baru: gunakan foto baru.
            | - remove_image=1: kosongkan foto utama.
            | - Selain itu: pertahankan foto lama.
            */

            $finalMainUrl = $newMainPath
                ? Storage::disk('public')->url(
                    $newMainPath
                )
                : (
                    $removeMainImage
                        ? null
                        : $oldMainUrl
                );

            /*
            | Perbarui database.
            */

            DB::transaction(
                function () use (
                    $product,
                    $validated,
                    $slug,
                    $finalMainUrl,
                    $finalGallery
                ): void {
                    $product->update([
                        ...$this->productData(
                            $validated,
                            $product
                        ),

                        'slug' => $slug,

                        'image' => $finalMainUrl,

                        'gallery_images' => $finalGallery,
                    ]);
                }
            );

            /*
            | Setelah database berhasil diperbarui,
            | bersihkan file yang tidak lagi digunakan.
            */

            $this->deleteRemovedImages(
                array_merge(
                    [$oldMainUrl],
                    $existingGallery
                ),

                array_merge(
                    [$finalMainUrl],
                    $finalGallery
                )
            );

            return response()->json([
                'success' => true,

                'message' =>
                    'Produk berhasil diperbarui.',

                'data' => $product
                    ->refresh()
                    ->load(
                        'category:id,name,slug,status'
                    ),
            ]);
        } catch (Throwable $error) {
            /*
            | Jika gagal, hapus file baru saja.
            | File lama tetap dipertahankan.
            */

            $this->deleteUploadedFiles(
                $uploadedPaths
            );

            report($error);

            return response()->json([
                'success' => false,
                'message' =>
                    'Produk gagal diperbarui.',
                'data' => null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | HAPUS PRODUK
    |--------------------------------------------------------------------------
    |
    | File gambar hanya dibersihkan jika penghapusan
    | produk pada database berhasil.
    */

    public function destroy(Product $product): JsonResponse
    {
        $allUrls = array_merge(
            [$product->image],
            $this->galleryImages($product)
        );

        try {
            $product->delete();
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,

                'message' =>
                    'Produk gagal dihapus karena masih digunakan dalam pengajuan.',

                'data' => null,
            ], 422);
        }

        /*
        | Produk sudah terhapus.
        | Sekarang bersihkan gambar dari storage.
        */

        $this->deleteRemovedImages(
            $allUrls,
            []
        );

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil dihapus.',
            'data' => null,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | GENERATE SLUG PRODUK
    |--------------------------------------------------------------------------
    */

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'produk';

        $slug = $base;

        $counter = 2;

        while (
            Product::where(
                'slug',
                $slug
            )->exists()
        ) {
            $slug = $base . '-' . $counter++;
        }

        return $slug;
    }
}
