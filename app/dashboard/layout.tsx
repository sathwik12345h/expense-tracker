import { LogOut } from "lucide-react"
import { signOut } from "@/lib/auth"
import { requireUser } from "@/lib/data"
import { initials } from "@/lib/format"
import AppActionsProvider from "@/components/shell/AppActions"
import AppShell from "@/components/shell/AppShell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  const signOutButton = (
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
        className="inline-flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-well hover:text-fg"
      >
        <LogOut size={17} strokeWidth={2} aria-hidden />
      </button>
    </form>
  )

  return (
    <AppActionsProvider userId={user.id}>
      <AppShell name={user.name} initials={initials(user.name)} signOut={signOutButton}>
        {children}
      </AppShell>
    </AppActionsProvider>
  )
}
