import { useEffect, useState } from 'react';
import { apiBaseUrl } from '../lib/api-client';
import { useContractDebug } from '../lib/contract-debug';

// ⚠️ TODO: BE 바뀌면 여기도 수동으로 바꿔야 함 (Ch02 의도적 안티패턴)
interface Product {
  id: number;
  name: string;
  priceInWon: number;
  stock: number;
  description: string;
}

export function Ch02ProductList() {
  const [items, setItems] = useState<Product[]>([]);
  const { setStatus } = useContractDebug();

  useEffect(() => {
    fetch(`${apiBaseUrl}/products`).then(async (r) => {
      setStatus(r.headers.get('x-contract-status') ?? 'unknown');
      setItems((await r.json()) as Product[]);
    });
  }, [setStatus]);

  return (
    <table>
      <thead><tr><th>ID</th><th>이름</th><th>가격(원)</th><th>재고</th></tr></thead>
      <tbody>
        {items.map((p) => (
          <tr key={p.id}><td>{p.id}</td><td>{p.name}</td><td>{p.priceInWon}</td><td>{p.stock}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
