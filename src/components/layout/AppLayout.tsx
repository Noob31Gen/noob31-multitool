import { useLocation } from "react-router-dom"
import { Header } from "./Header"
import { useUrlQuery } from "@/lib/useUrlQuery"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { isJsonMode } = useUrlQuery()
  const isHomePage = location.pathname === "/"

  if (isJsonMode) {
    return <>{children}</>
  }

  return (
    <div className="relative min-h-screen w-full bg-background overflow-x-hidden">
      <Header />
      <main className="p-4 sm:p-6">
        <div className={isHomePage ? "mx-auto max-w-5xl" : "mx-auto max-w-5xl pb-16"}>
          {children}
        </div>
      </main>
    </div>
  )
}