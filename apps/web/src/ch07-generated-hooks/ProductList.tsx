import { useEffect } from 'react';
import { $api } from '../lib/api-client';
import { useContractDebug } from '../lib/contract-debug';

export function Ch07ProductList() {
  const { data, isLoading } = $api.useQuery('get', '/products');
  const { setStatus } = useContractDebug();

  useEffect(() => {
    // openapi-react-query v0.5는 response 헤더 직접 노출 없음 → apiClient로 보조 폴링
    import('../lib/api-client').then(({ apiClient }) => {
      apiClient.GET('/products').then(({ response }) => {
        setStatus(response.headers.get('x-contract-status') ?? 'unknown');
      });
    });
  }, [setStatus]);

  if (isLoading) return <p>로딩 중...</p>;

  return (
    <table>
      <thead><tr><th>ID</th><th>이름</th><th>가격(원)</th></tr></thead>
      <tbody>{(data ?? []).map((p) => (
        <tr key={p.id}><td>{p.id}</td><td>{p.name}</td><td>{p.priceInWon}</td></tr>
      ))}</tbody>
    </table>
  );
}
