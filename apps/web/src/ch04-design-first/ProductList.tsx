import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import { useContractDebug } from '../lib/contract-debug';
import type { components } from '@contracts/generated';

type Product = components['schemas']['Product'];

export function Ch04ProductList() {
  const [items, setItems] = useState<Product[]>([]);
  const { setStatus } = useContractDebug();

  useEffect(() => {
    apiClient.GET('/products').then(({ data, response }) => {
      setStatus(response.headers.get('x-contract-status') ?? 'unknown');
      if (data) setItems(data);
    });
  }, [setStatus]);

  return (
    <table>
      <thead><tr><th>ID</th><th>이름</th><th>가격(원)</th><th>재고</th></tr></thead>
      <tbody>{items.map((p) => (
        <tr key={p.id}><td>{p.id}</td><td>{p.name}</td><td>{p.priceInWon}</td><td>{p.stock}</td></tr>
      ))}</tbody>
    </table>
  );
}
