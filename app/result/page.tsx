import ResultView from '../../components/ResultView';

export const metadata = { title: 'نتيجة التحقق | بيّنة' };

export default function ResultPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = typeof searchParams.q === 'string' ? searchParams.q.slice(0, 2000) : '';
  return <ResultView q={q} />;
}
