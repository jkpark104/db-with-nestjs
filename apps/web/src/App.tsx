import { ACTIVE_CHAPTER } from './active-chapter';
import { ContractDebugProvider } from './lib/contract-debug';
import { Ch02ProductList } from './ch02-code-first-swagger/ProductList';
import { Ch03ProductList } from './ch03-derived-spec-pain/ProductList';
import { Ch04ProductList } from './ch04-design-first/ProductList';

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
  switch (ACTIVE_CHAPTER) {
    case 'ch02': return <Ch02ProductList />;
    case 'ch03': return <Ch03ProductList />;
    case 'ch04': return <Ch04ProductList />;
    default: return <p>chapter {ACTIVE_CHAPTER} not yet implemented</p>;
  }
}
