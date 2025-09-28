"use client";

import { useProductsQuery } from "@/src/hooks/useProductsQuery";

export default function ProductsPage() {
  const { data: products, isLoading, error } = useProductsQuery();

  if (isLoading) return <p>Loading...</p>;
  if (error instanceof Error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h1>Products</h1>
      <ul className="space-y-2">
        {products?.map((p, index) => (
          <li key={index} className="border p-2 rounded">
            <p className="font-semibold">{p.name}</p>
            <p className="text-gray-600">${p.base_price}</p>
            <p className="text-gray-600">{p.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
