// Every chart's table-view twin: the same numbers, no colour required.

const NUMERIC = /^[≈−+-]?\$?[\d.,]+\s?(?:[KMB%×x]|\/day)?$/

function isNumericColumn(rows: Array<Array<string | number>>, index: number) {
  return (
    rows.length > 0 &&
    rows.every((row) => {
      const cell = row[index]
      return typeof cell === "number" || NUMERIC.test(String(cell).trim()) || cell === "—"
    })
  )
}

export function ChartTable({
  caption, columns, rows,
}: { caption: string; columns: string[]; rows: Array<Array<string | number>> }) {
  const numeric = columns.map((_, i) => i > 0 && isNumericColumn(rows, i))

  return (
    <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
      <table className="w-full border-collapse text-[13px]">
        <caption className="eyebrow pb-3 text-left text-muted">{caption}</caption>
        <thead>
          <tr className="border-b border-line-2">
            {columns.map((col, i) => (
              <th
                key={col}
                scope="col"
                className={`whitespace-nowrap pb-2 font-mono text-[10.5px] font-normal uppercase tracking-[0.12em] text-muted ${
                  numeric[i] ? "pl-4 text-right" : i === 0 ? "pr-4 text-left" : "px-4 text-left"
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-6 text-center text-muted">
                Nothing to show yet.
              </td>
            </tr>
          )}
          {rows.map((row, r) => (
            <tr key={r} className="border-b border-line transition-colors last:border-0 hover:bg-paper-2/50">
              {row.map((cell, i) => {
                const text = typeof cell === "number" ? cell.toLocaleString("en-US") : cell
                return i === 0 ? (
                  <th key={i} scope="row" className="whitespace-nowrap py-2 pr-4 text-left font-medium text-ink">
                    {text}
                  </th>
                ) : (
                  <td
                    key={i}
                    className={`whitespace-nowrap py-2 tnum ${numeric[i] ? "pl-4 text-right text-ink" : "px-4 text-left text-ink-2"}`}
                  >
                    {text}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
