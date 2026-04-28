import { useQueryClient } from '@tanstack/react-query';
import { $api } from '../lib/api-client';

export function Ch07CreateOrderForm() {
  const queryClient = useQueryClient();
  const create = $api.useMutation('post', '/orders');
  const { queryKey } = $api.queryOptions('get', '/products');

  const submit = () => {
    create.mutate(
      { body: { userId: 1, items: [{ productId: 1, quantity: 2 }] } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKey.slice(0, 1) }) },
    );
  };

  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={submit} disabled={create.isPending}>
        주문 생성 {create.isSuccess ? '✓' : ''}
      </button>
      {create.isError && <p style={{ color: 'red' }}>오류: {String(create.error)}</p>}
    </div>
  );
}
