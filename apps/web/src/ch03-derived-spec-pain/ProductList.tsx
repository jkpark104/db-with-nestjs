import { useEffect, useState } from 'react';
import { apiBaseUrl } from '../lib/api-client';
import { useContractDebug } from '../lib/contract-debug';

// ❌ Ch02 그대로. BE는 category를 추가했지만 우리는 모른다.
interface Product {
  id: number;
  name: string;
  priceInWon: number;
  stock: number;
  description: string;
}

export function Ch03ProductList() {
  const [items, setItems] = useState<Product[]>([]);
  const { setStatus } = useContractDebug();

  useEffect(() => {
    fetch(`${apiBaseUrl}/products`).then(async (r) => {
      const json = await r.json();
      setStatus(r.headers.get('x-contract-status') ?? 'unknown');

      const knownKeys = new Set(['id', 'name', 'priceInWon', 'stock', 'description']);
      const extraKeys = json[0] ? Object.keys(json[0]).filter((k) => !knownKeys.has(k)) : [];
      if (extraKeys.length) {
        setStatus(`code-derived; runtime-mismatch=${extraKeys.join(',')}`);
      }
      setItems(json as Product[]);
    });
  }, [setStatus]);

  return (
    <table>
      <thead><tr><th>ID</th><th>이름</th><th>가격</th><th>category</th></tr></thead>
      <tbody>
        {items.map((p) => (
          <tr key={p.id}>
            <td>{p.id}</td><td>{p.name}</td><td>{p.priceInWon}</td>
            {/* ⚠️ category 필드는 우리 인터페이스에 없으므로 undefined */}
            <td>{(p as Product & { category?: string }).category ?? '(undefined)'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
