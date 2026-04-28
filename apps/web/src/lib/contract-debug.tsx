import { createContext, useContext, useState, type ReactNode } from 'react';

type Ctx = {
  status: string;
  setStatus: (s: string) => void;
};

const ContractDebugContext = createContext<Ctx | null>(null);

export function ContractDebugProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<string>('unknown');
  return (
    <ContractDebugContext.Provider value={{ status, setStatus }}>
      {children}
      <ContractDebugBadge status={status} />
    </ContractDebugContext.Provider>
  );
}

export function useContractDebug(): Ctx {
  const ctx = useContext(ContractDebugContext);
  if (!ctx) throw new Error('useContractDebug must be inside ContractDebugProvider');
  return ctx;
}

function ContractDebugBadge({ status }: { status: string }) {
  const tone = status.includes('violation') || status.includes('breaking')
    ? '#c0392b'
    : status.includes('runtime-validated=ok') || status.includes('compat=stable')
      ? '#27ae60'
      : status === 'unknown'
        ? '#7f8c8d'
        : '#2c3e50';
  return (
    <div
      style={{
        position: 'fixed', right: 12, bottom: 12, padding: '6px 10px',
        background: tone, color: '#fff', font: '12px/1.4 monospace',
        borderRadius: 4, zIndex: 1000, maxWidth: 360,
      }}
      data-testid="contract-status-badge"
    >
      x-contract-status: {status}
    </div>
  );
}
