import Ornament from './Ornament';

/** رأس الصفحات الداخلية: شريط زمردي بنقش هندسي */
export default function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="page-head">
      <div className="container">
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
    </header>
  );
}

export { Ornament };
