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
