<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class CategoryController extends Controller
{
    /**
     * Menampilkan seluruh kategori untuk halaman admin.
     */
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->withCount('products')
            ->latest('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar kategori berhasil diambil.',
            'data' => $categories,
        ]);
    }

    /**
     * Menampilkan detail kategori.
     */
    public function show(
        Category $category
    ): JsonResponse {
        $category->loadCount('products');

        return response()->json([
            'success' => true,
            'message' => 'Detail kategori berhasil diambil.',
            'data' => $category,
        ]);
    }

    /**
     * Menambahkan kategori.
     */
    public function store(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
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
                'unique:categories,slug',
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'status' => [
                'required',
                Rule::in([
                    'active',
                    'inactive',
                ]),
            ],
        ], [
            'name.required' =>
                'Nama kategori wajib diisi.',

            'name.min' =>
                'Nama kategori minimal tiga karakter.',

            'name.max' =>
                'Nama kategori maksimal 255 karakter.',

            'slug.regex' =>
                'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.',

            'slug.unique' =>
                'Slug kategori sudah digunakan.',

            'slug.max' =>
                'Slug maksimal 255 karakter.',

            'description.max' =>
                'Deskripsi maksimal 5.000 karakter.',

            'status.required' =>
                'Status kategori wajib dipilih.',

            'status.in' =>
                'Status kategori tidak valid.',
        ]);

        $slug = $this->generateUniqueSlug(
            $validated['slug'] ??
                $validated['name']
        );

        try {
            $category = DB::transaction(
                function () use (
                    $validated,
                    $slug
                ): Category {
                    return Category::query()
                        ->create([
                            'name' =>
                                trim(
                                    $validated['name']
                                ),

                            'slug' =>
                                $slug,

                            'description' =>
                                isset(
                                    $validated['description']
                                )
                                    ? trim(
                                        $validated['description']
                                    )
                                    : null,

                            'status' =>
                                $validated['status'],
                        ]);
                }
            );

            $category->loadCount(
                'products'
            );

            return response()->json([
                'success' => true,
                'message' => 'Kategori berhasil ditambahkan.',
                'data' => $category,
            ], 201);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Kategori gagal ditambahkan.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Memperbarui kategori.
     */
    public function update(
        Request $request,
        Category $category
    ): JsonResponse {
        $validated = $request->validate([
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

                Rule::unique(
                    'categories',
                    'slug'
                )->ignore(
                    $category->id
                ),
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'status' => [
                'required',
                Rule::in([
                    'active',
                    'inactive',
                ]),
            ],
        ], [
            'name.required' =>
                'Nama kategori wajib diisi.',

            'name.min' =>
                'Nama kategori minimal tiga karakter.',

            'name.max' =>
                'Nama kategori maksimal 255 karakter.',

            'slug.regex' =>
                'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.',

            'slug.unique' =>
                'Slug kategori sudah digunakan.',

            'slug.max' =>
                'Slug maksimal 255 karakter.',

            'description.max' =>
                'Deskripsi maksimal 5.000 karakter.',

            'status.required' =>
                'Status kategori wajib dipilih.',

            'status.in' =>
                'Status kategori tidak valid.',
        ]);

        $requestedSlug =
            $validated['slug'] ??
            $validated['name'];

        $slug =
            Str::slug(
                $requestedSlug
            );

        if ($slug === '') {
            $slug =
                Str::slug(
                    $validated['name']
                );
        }

        try {
            DB::transaction(
                function () use (
                    $category,
                    $validated,
                    $slug
                ): void {
                    $category->update([
                        'name' =>
                            trim(
                                $validated['name']
                            ),

                        'slug' =>
                            $slug,

                        'description' =>
                            isset(
                                $validated['description']
                            )
                                ? trim(
                                    $validated['description']
                                )
                                : null,

                        'status' =>
                            $validated['status'],
                    ]);
                }
            );

            $category->refresh();
            $category->loadCount(
                'products'
            );

            return response()->json([
                'success' => true,
                'message' => 'Kategori berhasil diperbarui.',
                'data' => $category,
            ]);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Kategori gagal diperbarui.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Menghapus kategori.
     */
    public function destroy(
        Category $category
    ): JsonResponse {
        $category->loadCount(
            'products'
        );

        if (
            $category->products_count >
            0
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Kategori tidak bisa dihapus karena masih digunakan oleh produk.',
                'data' => [
                    'products_count' =>
                        $category->products_count,
                ],
            ], 422);
        }

        try {
            $category->delete();

            return response()->json([
                'success' => true,
                'message' => 'Kategori berhasil dihapus.',
                'data' => null,
            ]);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Kategori gagal dihapus.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Membuat slug kategori yang unik.
     */
    private function generateUniqueSlug(
        string $value
    ): string {
        $baseSlug =
            Str::slug(
                trim($value)
            );

        if ($baseSlug === '') {
            $baseSlug =
                'kategori';
        }

        $slug =
            $baseSlug;

        $counter = 2;

        while (
            Category::query()
                ->where(
                    'slug',
                    $slug
                )
                ->exists()
        ) {
            $slug =
                $baseSlug .
                '-' .
                $counter;

            $counter++;
        }

        return $slug;
    }
}