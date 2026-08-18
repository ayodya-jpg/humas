<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class ProductController extends Controller
{
    public function index(): JsonResponse
    {
        $products =
            Product::query()
                ->with([
                    'category:id,name,slug,status',
                ])
                ->latest(
                    'created_at'
                )
                ->get();

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Daftar produk berhasil diambil.',

            'data' =>
                $products,
        ]);
    }

    public function show(
        Product $product
    ): JsonResponse {
        $product->load([
            'category:id,name,slug,status',
        ]);

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Detail produk berhasil diambil.',

            'data' =>
                $product,
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        $validated =
            $request->validate(
                $this->validationRules(),
                $this->validationMessages()
            );

        $slug =
            $this->generateUniqueSlug(
                $validated['slug']
                    ?? $validated['name']
            );

        try {
            $product =
                DB::transaction(
                    function () use (
                        $validated,
                        $slug
                    ): Product {
                        return Product::query()
                            ->create([
                                'category_id' =>
                                    $validated[
                                        'category_id'
                                    ],

                                'name' =>
                                    trim(
                                        $validated[
                                            'name'
                                        ]
                                    ),

                                'slug' =>
                                    $slug,

                                'description' =>
                                    !empty(
                                        $validated[
                                            'description'
                                        ] ?? null
                                    )
                                        ? trim(
                                            $validated[
                                                'description'
                                            ]
                                        )
                                        : null,

                                'stock' =>
                                    $validated[
                                        'stock'
                                    ],

                                'type' =>
                                    $validated[
                                        'type'
                                    ],

                                'sekpim_item_type' =>
                                    $validated[
                                        'sekpim_item_type'
                                    ] ?? null,

                                'image' =>
                                    !empty(
                                        $validated[
                                            'image'
                                        ] ?? null
                                    )
                                        ? trim(
                                            $validated[
                                                'image'
                                            ]
                                        )
                                        : null,

                                'status' =>
                                    $validated[
                                        'status'
                                    ],
                            ]);
                    }
                );

            $product->load([
                'category:id,name,slug,status',
            ]);

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Produk berhasil ditambahkan.',

                'data' =>
                    $product,
            ], 201);
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
                    app()->isLocal()
                        ? $error->getMessage()
                        : 'Produk gagal ditambahkan.',

                'data' =>
                    null,
            ], 500);
        }
    }

    public function update(
        Request $request,
        Product $product
    ): JsonResponse {
        $rules =
            $this->validationRules(
                $product
            );

        $validated =
            $request->validate(
                $rules,
                $this->validationMessages()
            );

        $requestedSlug =
            $validated['slug']
                ?? $validated['name'];

        $slug =
            Str::slug(
                $requestedSlug
            );

        if (
            $slug ===
            ''
        ) {
            $slug =
                Str::slug(
                    $validated[
                        'name'
                    ]
                );
        }

        try {
            DB::transaction(
                function () use (
                    $product,
                    $validated,
                    $slug
                ): void {
                    $product->update([
                        'category_id' =>
                            $validated[
                                'category_id'
                            ],

                        'name' =>
                            trim(
                                $validated[
                                    'name'
                                ]
                            ),

                        'slug' =>
                            $slug,

                        'description' =>
                            !empty(
                                $validated[
                                    'description'
                                ] ?? null
                            )
                                ? trim(
                                    $validated[
                                        'description'
                                    ]
                                )
                                : null,

                        'stock' =>
                            $validated[
                                'stock'
                            ],

                        'type' =>
                            $validated[
                                'type'
                            ],

                        'sekpim_item_type' =>
                            $validated[
                                'sekpim_item_type'
                            ] ?? null,

                        'image' =>
                            !empty(
                                $validated[
                                    'image'
                                ] ?? null
                            )
                                ? trim(
                                    $validated[
                                        'image'
                                    ]
                                )
                                : null,

                        'status' =>
                            $validated[
                                'status'
                            ],
                    ]);
                }
            );

            $product->refresh();

            $product->load([
                'category:id,name,slug,status',
            ]);

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Produk berhasil diperbarui.',

                'data' =>
                    $product,
            ]);
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
                    app()->isLocal()
                        ? $error->getMessage()
                        : 'Produk gagal diperbarui.',

                'data' =>
                    null,
            ], 500);
        }
    }

    public function destroy(
        Product $product
    ): JsonResponse {
        try {
            $product->delete();

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Produk berhasil dihapus.',

                'data' =>
                    null,
            ]);
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
                    'Produk gagal dihapus karena masih terhubung dengan data pengajuan.',

                'data' =>
                    null,
            ], 422);
        }
    }

    private function validationRules(
        ?Product $product = null
    ): array {
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
                    ? Rule::unique(
                        'products',
                        'slug'
                    )->ignore(
                        $product->id
                    )
                    : Rule::unique(
                        'products',
                        'slug'
                    ),
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
                'nullable',

                Rule::in([
                    Product::SEKPIM_TYPE_BORROW,
                    Product::SEKPIM_TYPE_ASSET_REQUEST,
                    Product::SEKPIM_TYPE_BOTH,
                ]),
            ],

            'image' => [
                'nullable',
                'string',
                'max:2000',
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

    private function validationMessages(): array
    {
        return [
            'category_id.required' =>
                'Kategori produk wajib dipilih.',

            'category_id.integer' =>
                'Kategori produk tidak valid.',

            'category_id.exists' =>
                'Kategori produk tidak ditemukan.',

            'name.required' =>
                'Nama produk wajib diisi.',

            'name.min' =>
                'Nama produk minimal tiga karakter.',

            'name.max' =>
                'Nama produk maksimal 255 karakter.',

            'slug.regex' =>
                'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.',

            'slug.unique' =>
                'Slug produk sudah digunakan.',

            'slug.max' =>
                'Slug maksimal 255 karakter.',

            'description.max' =>
                'Deskripsi maksimal 5.000 karakter.',

            'stock.required' =>
                'Stok produk wajib diisi.',

            'stock.integer' =>
                'Stok harus berupa bilangan bulat.',

            'stock.min' =>
                'Stok tidak boleh kurang dari nol.',

            'type.required' =>
                'Jenis produk wajib dipilih.',

            'type.in' =>
                'Jenis produk tidak valid.',

            'sekpim_item_type.in' =>
                'Jenis penggunaan barang SEKPiM tidak valid.',

            'image.max' =>
                'URL gambar maksimal 2.000 karakter.',

            'status.required' =>
                'Status produk wajib dipilih.',

            'status.in' =>
                'Status produk tidak valid.',
        ];
    }

    private function generateUniqueSlug(
        string $value
    ): string {
        $baseSlug =
            Str::slug(
                trim(
                    $value
                )
            );

        if (
            $baseSlug ===
            ''
        ) {
            $baseSlug =
                'produk';
        }

        $slug =
            $baseSlug;

        $counter =
            2;

        while (
            Product::query()
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