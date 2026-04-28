import { ACTIVE_CHAPTER } from './active-chapter';
import { ContractDebugProvider } from './lib/contract-debug';

export default function App() {
  return (
    <ContractDebugProvider>
      <main style={{ font: '14px/1.5 system-ui', padding: 16 }}>
        <h1>OAS Lecture — {ACTIVE_CHAPTER}</h1>
        <ChapterContent />
      </main>
    </ContractDebugProvider>
  );
}

function ChapterContent() {
  // Ch02 페이지는 Phase 2에서 추가. 본 Phase 0에선 placeholder.
  return <p>chapter page not loaded yet</p>;
}
