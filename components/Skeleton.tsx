/**
 * Skeleton loading — bentuknya meniru isi yang akan muncul, supaya layout tidak
 * melompat saat data datang (beda dari teks "Memuat…" yang tingginya beda jauh
 * dari konten aslinya).
 */

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <section className="stats" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="stat" key={i}>
          <span className="sk sk--text sk--short" style={{ display: 'block' }} />
          <span className="sk sk--value" style={{ display: 'block', marginTop: 'var(--space-2xs)' }} />
          <span className="sk sk--text sk--line" style={{ display: 'block', marginTop: 'var(--space-2xs)' }} />
        </div>
      ))}
    </section>
  )
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <section className="grid-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <article className="card" key={i}>
          <div className="row" style={{ marginBottom: 'var(--space-md)' }}>
            <span className="sk" style={{ width: '1.75rem', height: '1.75rem' }} />
            <span className="sk sk--title" style={{ flex: 1 }} />
          </div>
          <div className="stats">
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j}>
                <span className="sk sk--text sk--short" style={{ display: 'block' }} />
                <span
                  className="sk sk--value"
                  style={{ display: 'block', marginTop: 'var(--space-2xs)' }}
                />
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  )
}

export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="tablewrap" aria-hidden="true">
      <table className="table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c}>
                  <span
                    className={`sk sk--row${c === 0 ? '' : ' sk--short'}`}
                    style={{ display: 'block', width: c === 0 ? '85%' : '55%' }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Label untuk pembaca layar — skeleton visualnya aria-hidden. */
export function LoadingLabel({ children }: { children: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {children}
    </span>
  )
}
