import createClient from 'openapi-fetch';
import createApi from 'openapi-react-query';
import type { paths } from '@contracts/generated';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const fetchClient = createClient<paths>({ baseUrl: BASE_URL });
export const apiClient = fetchClient;
export const $api = createApi(fetchClient);

export function isPrismMockBaseUrl(): boolean {
  try {
    return new URL(BASE_URL).port === '4010';
  } catch {
    return false;
  }
}

export function deriveContractStatus(headerValue: string | null): string {
  if (headerValue) return headerValue;
  // Prism은 사용자 정의 헤더를 자동 주입하지 않음 → FE 합성
  if (isPrismMockBaseUrl()) return 'spec-derived; served-by=prism-mock';
  return 'unknown';
}

export const apiBaseUrl = BASE_URL;
