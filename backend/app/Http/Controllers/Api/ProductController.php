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
use RuntimeException;
use Throwable;

class ProductController extends Controller
{
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

    public function show(Product $product): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Detail produk berhasil diambil.',
            'data' => $product->load('category:id,name,slug,status'),
        ]);
    }

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
                    ? Rule::unique('products', 'slug')
                        ->ignore($product->id)
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
                Rule::in([
                    'checkout',
                    'borrow',
                    'both',
                ]),
            ],

            'sekpim_item_type' => [
                'sometimes',
                'nullable',
                Rule::in([
                    'borrow',
                    'asset_request',
                    'both',
                ]),
            ],

            // Gambar diunggah langsung dari perangkat.
            'image_file' => [
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],

            // Digunakan ketika admin ingin menghapus foto lama.
            'remove_image' => [
                'sometimes',
                'boolean',
            ],

            'status' => [
                'required',
                Rule::in([
                    'active',
                    'inactive',
                ]),
            ],
        ];
    }

    private function messages(): array
    {
        return [
            'image_file.mimes' =>
                'Gambar harus berupa JPG, JPEG, PNG, atau WEBP.',

            'image_file.max' =>
                'Ukuran gambar maksimal 5 MB.',

            'image_file.file' =>
                'Berkas gambar tidak valid.',
        ];
    }

    private function productData(
        array $data,
        ?Product $product = null
    ): array {
        $type = $data['type'];

        $sekpimType = array_key_exists(
            'sekpim_item_type',
            $data
        )
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
    | UPLOAD FOTO PRODUK
    |--------------------------------------------------------------------------
    |
    | Semua produk menggunakan disk public Laravel.
    | Folder: storage/app/public/products
    |
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
                'Gagal menyimpan gambar produk.'
            );
        }

        return $path;
    }

    /*
    |--------------------------------------------------------------------------
    | IDENTIFIKASI FOTO LOKAL
    |--------------------------------------------------------------------------
    |
    | File eksternal milik produk lama tidak boleh dihapus.
    | Hanya file pada storage/products yang dapat dibersihkan.
    |
    */

    private function localImagePath(?string $image): ?string
    {
        if (!$image) {
            return null;
        }

        $host = parse_url($image, PHP_URL_HOST);

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
    | TAMBAH PRODUK
    |--------------------------------------------------------------------------
    */

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(
            $this->rules(),
            $this->messages()
        );

        $slug = $this->uniqueSlug(
            $validated['slug'] ?? $validated['name']
        );

        $newImagePath = null;

        try {
            $newImagePath = $this->uploadImage($request);

            $product = DB::transaction(
                function () use (
                    $validated,
                    $slug,
                    $newImagePath
                ): Product {
                    return Product::create([
                        ...$this->productData($validated),

                        'image' => $newImagePath
                            ? Storage::disk('public')->url(
                                $newImagePath
                            )
                            : null,

                        'slug' => $slug,
                    ]);
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Produk berhasil ditambahkan.',
                'data' => $product->load(
                    'category:id,name,slug,status'
                ),
            ], 201);
        } catch (Throwable $error) {
            if ($newImagePath) {
                Storage::disk('public')->delete(
                    $newImagePath
                );
            }

            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Produk gagal ditambahkan.',
                'data' => null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | EDIT PRODUK
    |--------------------------------------------------------------------------
    |
    | 1. Ada foto baru   => ganti foto lama.
    | 2. remove_image=1  => hapus foto.
    | 3. Tidak keduanya  => pertahankan foto lama.
    |
    */

    public function update(
        Request $request,
        Product $product
    ): JsonResponse {
        $validated = $request->validate(
            $this->rules($product),
            $this->messages()
        );

        $slug = !empty($validated['slug'])
            ? Str::slug($validated['slug'])
            : $product->slug;

        $oldImagePath = $this->localImagePath(
            $product->image
        );

        $newImagePath = null;

        $removeImage = $request->boolean(
            'remove_image'
        );

        try {
            $newImagePath = $this->uploadImage(
                $request
            );

            DB::transaction(
                function () use (
                    $product,
                    $validated,
                    $slug,
                    $newImagePath,
                    $removeImage
                ): void {
                    $data = [
                        ...$this->productData(
                            $validated,
                            $product
                        ),

                        'slug' => $slug,
                    ];

                    if ($newImagePath) {
                        $data['image'] = Storage::disk(
                            'public'
                        )->url($newImagePath);
                    } elseif ($removeImage) {
                        $data['image'] = null;
                    }

                    // Jika tidak ada perubahan gambar,
                    // foto lama tetap digunakan.

                    $product->update($data);
                }
            );

            // Bersihkan foto lokal lama setelah
            // penyimpanan database berhasil.
            if (
                ($newImagePath || $removeImage) &&
                $oldImagePath
            ) {
                Storage::disk('public')->delete(
                    $oldImagePath
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Produk berhasil diperbarui.',
                'data' => $product->refresh()->load(
                    'category:id,name,slug,status'
                ),
            ]);
        } catch (Throwable $error) {
            if ($newImagePath) {
                Storage::disk('public')->delete(
                    $newImagePath
                );
            }

            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Produk gagal diperbarui.',
                'data' => null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | HAPUS PRODUK
    |--------------------------------------------------------------------------
    */

    public function destroy(Product $product): JsonResponse
    {
        $oldImagePath = $this->localImagePath(
            $product->image
        );

        try {
            $product->delete();

            if ($oldImagePath) {
                Storage::disk('public')->delete(
                    $oldImagePath
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Produk berhasil dihapus.',
                'data' => null,
            ]);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' =>
                    'Produk gagal dihapus karena masih digunakan dalam pengajuan.',
                'data' => null,
            ], 422);
        }
    }

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
