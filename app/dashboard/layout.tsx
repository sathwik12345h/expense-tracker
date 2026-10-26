import Link from "next/link"
import { LogOut } from "lucide-react"
import { auth, signOut } from "@/lib/auth"
import { Logo, LogoMark } from "@/components/ui/Logo"
import AppNav from "@/components/dashboard/AppNav"
import { initials } from "@/lib/format"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const name = session?.user?.name?.trim() || session?.user?.email?.split("@")[0] || ""
  const firstName = name.split(/\s+/)[0]

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:grid sm:h-[68px] sm:grid-cols-[1fr_auto_1fr] sm:gap-6 sm:px-6 lg:px-8">
          {/* the wordmark doesn't fit beside the tabs on a phone — the receipt mark stands in */}
          <Link
            href="/dashboard"
            aria-label="Spendwise home"
            className="inline-flex shrink-0 transition-transform duration-300 hover:-rotate-6 sm:hidden"
          >
            <LogoMark size={24} />
          </Link>
          <div className="hidden sm:block">
            <Logo href="/dashboard" />
          </div>

          <div className="flex min-w-0 flex-1 justify-center">
            <AppNav />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2.5 rounded-full md:border md:border-line md:bg-card md:py-1 md:pl-1 md:pr-4">
              <span
                aria-hidden
                className="inline-flex size-9 items-center justify-center rounded-full bg-ink font-mono text-[12px] tracking-wide text-on-ink"
              >
                {initials(name)}
              </span>
              <span className="hidden max-w-[140px] truncate text-[13.5px] font-medium text-ink md:block">
                {firstName}
              </span>
              <span className="sr-only md:hidden">Signed in as {name}</span>
            </div>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            >
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink"
              >
                <LogOut size={17} strokeWidth={1.8} />
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </>
  )
}
