export function CodeBlock({ code, language }: { code: string; language?: string | null }) {
  const lines = code.split("\n");
  return (
    <div className="overflow-hidden border border-[var(--border)]">
      {language && (
        <div className="border-b border-[var(--border)] bg-[var(--panel)] px-4 py-1.5">
          <span className="mono-tag text-[10px] uppercase tracking-widest text-[var(--muted)]">
            {language}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto bg-[var(--panel)] py-3 font-mono text-[13px] leading-relaxed">
        <code>
          {lines.map((line, i) => (
            <div key={i} className="flex px-4">
              <span className="mr-4 w-5 shrink-0 select-none text-right text-[var(--border)]">{i + 1}</span>
              <span className="whitespace-pre">{line || " "}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
