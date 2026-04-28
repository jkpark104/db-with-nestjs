import { useEffect, useState } from 'react';
import { apiClient, deriveContractStatus } from '../lib/api-client';
import { useContractDebug } from '../lib/contract-debug';
import type { components } from '@contracts/generated';

type Product = components['schemas']['Product'];

export function Ch05ProductList() {
  const [items, setItems] = useState<Product[]>([]);
  const { setStatus } = useContractDebug();

  useEffect(() => {
    apiClient.GET('/products').then(({ data, response }) => {
      const headerVal = response.headers.get('x-contract-status');
      setStatus(deriveContractStatus(headerVal));
      if (data) setItems(data);
    });
  }, [setStatus]);

  return (
    <div>
      <p>items count: {items.length} (Prism mock if BE off)</p>
      <table>
        <thead><tr><th>ID</th><th>이름</th><th>가격(원)</th></tr></thead>
        <tbody>{items.map((p) => (
          <tr key={p.id}><td>{p.id}</td><td>{p.name}</td><td>{p.priceInWon}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}
