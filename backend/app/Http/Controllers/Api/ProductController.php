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
            'data' => $product->load(
                'category:id,name,slug,status'
            ),
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
            // Produk lama bertipe borrow/both
            // dianggap sebagai barang peminjaman.
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

            'image' => isset($data['image'])
                ? trim($data['image'])
                : null,

            'status' => $data['status'],
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(
            $this->rules()
        );

        $slug = $this->uniqueSlug(
            $validated['slug'] ?? $validated['name']
        );

        try {
            $product = DB::transaction(
                fn () => Product::create([
                    ...$this->productData($validated),
                    'slug' => $slug,
                ])
            );

            return response()->json([
                'success' => true,
                'message' => 'Produk berhasil ditambahkan.',
                'data' => $product->load(
                    'category:id,name,slug,status'
                ),
            ], 201);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Produk gagal ditambahkan.',
                'data' => null,
            ], 500);
        }
    }

    public function update(
        Request $request,
        Product $product
    ): JsonResponse {
        $validated = $request->validate(
            $this->rules($product)
        );

        $slug = array_key_exists('slug', $validated)
            && $validated['slug']
                ? Str::slug($validated['slug'])
                : $product->slug;

        try {
            DB::transaction(
                function () use (
                    $product,
                    $validated,
                    $slug
                ): void {
                    $product->update([
                        ...$this->productData(
                            $validated,
                            $product
                        ),
                        'slug' => $slug,
                    ]);
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'Produk berhasil diperbarui.',
                'data' => $product->refresh()->load(
                    'category:id,name,slug,status'
                ),
            ]);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Produk gagal diperbarui.',
                'data' => null,
            ], 500);
        }
    }

    public function destroy(Product $product): JsonResponse
    {
        try {
            $product->delete();

            return response()->json([
                'success' => true,
                'message' => 'Produk berhasil dihapus.',
                'data' => null,
            ]);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Produk gagal dihapus karena masih digunakan dalam pengajuan.',
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
            Product::where('slug', $slug)->exists()
        ) {
            $slug = $base . '-' . $counter++;
        }

        return $slug;
    }
}
