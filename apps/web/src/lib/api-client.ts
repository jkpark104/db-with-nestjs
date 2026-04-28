// Ch04 진입 시 paths 타입을 import해서 createClient<paths>()로 교체된다.
// 본 단계에서는 baseUrl 주입과 prism 합성 헤더 로직만 미리 둔다.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

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
