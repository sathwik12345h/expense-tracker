import { CategoryGlyph } from "@/components/ui/categories"
import { formatMoney } from "@/lib/format"

interface Expense {
  id: string
  name: string
  amount: number
  type: string
  category: string
  date: Date | string
}

interface Props {
  expenses: Expense[]
  filterCategory?: string | null
  filterType?: string | null
}

const SHOWN = 10

function shortDate(value: Date | string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function signedAmount(e: Expense) {
  return formatMoney(e.type === "income" ? e.amount : -e.amount, { signed: true })
}

/**
 * Every matching entry as one bar, oldest to newest, height by amount — the
 * receipt's barcode, except it's the data.
 */
function DataBarcode({ rows }: { rows: Expense[] }) {
  const ordered = [...rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const biggest = ordered.reduce<Expense | null>((top, e) => (!top || e.amount > top.amount ? e : top), null)
  if (!biggest || biggest.amount <= 0) return null
  return (
    <figure className="mt-5">
      <div className="flex items-end gap-3 text-[9px] tracking-[0.18em] text-muted">
        <span aria-hidden className="pb-px">OLDEST</span>
        <div
          role="img"
          aria-label={`${ordered.length} entries from oldest to newest, bar height by amount. Largest ${formatMoney(biggest.amount)}, ${biggest.name}, ${shortDate(biggest.date)}.`}
          className="flex h-10 flex-1 items-end justify-center gap-[3px] border-b border-line-2"
        >
          {ordered.map((e) => (
            <span
              key={e.id}
              title={`${shortDate(e.date)} · ${e.name} · ${signedAmount(e)}`}
              className={`min-w-[2px] max-w-[7px] flex-1 rounded-t-[1.5px] ${e.type === "income" ? "bg-income" : "bg-ink"} ${
                e.id === biggest.id ? "" : "opacity-75"
              }`}
              style={{ height: `${Math.max(8, (e.amount / biggest.amount) * 100)}%` }}
            />
          ))}
        </div>
        <span aria-hidden className="pb-px">NEWEST</span>
      </div>
      <figcaption className="mt-2 text-center text-[9.5px] tracking-[0.2em] text-muted">
        TALLEST {formatMoney(biggest.amount)} · {shortDate(biggest.date).toUpperCase()}
      </figcaption>
    </figure>
  )
}

/** A short receipt of the entries an answer refers to: newest ten, then a count. */
export default function TransactionList({ expenses, filterCategory, filterType }: Props) {
  const filtered = expenses.filter((e) => {
    if (filterCategory && e.category !== filterCategory) return false
    if (filterType && e.type !== filterType) return false
    return true
  })

  if (filtered.length === 0) {
    return (
      <div className="py-2">
        <p className="font-serif text-[22px] italic leading-tight text-ink">Nothing on the receipt.</p>
        <p className="mt-1 text-[13px] text-muted">
          {filterCategory ? `No recent entries in ${filterCategory}.` : "No recent entries match that question."}
        </p>
      </div>
    )
  }

  const net = filtered.reduce((sum, e) => (e.type === "income" ? sum + e.amount : sum - e.amount), 0)
  const shown = filtered.slice(0, SHOWN)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[13.5px] text-ink-2">
          <span className="font-medium text-ink">{filtered.length}</span> {filtered.length === 1 ? "entry" : "entries"}
          {filterCategory ? ` in ${filterCategory}` : ""}
          {filterType ? ` · money ${filterType === "income" ? "in" : "out"}` : ""}
        </p>
        <p className={`text-[16px] font-semibold tracking-tight ${net > 0 ? "text-income" : "text-ink"}`}>
          <span className="sr-only">Net </span>
          {formatMoney(net, { signed: true })}
        </p>
      </div>

      <div className="drop-paper mt-3">
        <div className="torn-bottom rounded-t-[14px] bg-card px-4 pt-4 font-mono text-[12px] text-ink-2 sm:px-5">
          <div className="flex items-baseline justify-between text-[10px] tracking-[0.18em] text-muted">
            <span>LEDGER EXTRACT</span>
            <span>{filterCategory ? filterCategory.toUpperCase() : "ALL CATEGORIES"}</span>
          </div>
          <div className="perforation my-3" />
          <ul>
            {shown.map((e) => (
              <li key={e.id} className="flex items-center gap-2.5 py-1.5">
                <span className="w-[42px] shrink-0 text-[11px] text-muted">{shortDate(e.date)}</span>
                {/* one category throughout? then the glyph is noise — give the name the room */}
                {!filterCategory && (
                  <>
                    <CategoryGlyph category={e.category} size={22} className="rounded-[6px]" />
                    <span className="sr-only">{e.category}</span>
                  </>
                )}
                <span className="flex min-w-0 flex-1 items-end gap-2">
                  <span className="truncate text-ink">{e.name}</span>
                  <span className="leader" aria-hidden />
                  <span className={`shrink-0 tnum ${e.type === "income" ? "text-income" : "text-ink"}`}>{signedAmount(e)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="perforation my-3" />
          <div className="flex items-end gap-2 text-[12.5px] font-semibold text-ink">
            <span>NET</span>
            <span className="leader" aria-hidden />
            <span className={`tnum ${net > 0 ? "text-income" : ""}`}>{formatMoney(net, { signed: true })}</span>
          </div>
          {filtered.length > SHOWN && (
            <p className="mt-1 text-right text-[10px] text-muted">
              Showing {SHOWN} of {filtered.length}
            </p>
          )}
          <DataBarcode rows={filtered} />
        </div>
      </div>
    </div>
  )
}
