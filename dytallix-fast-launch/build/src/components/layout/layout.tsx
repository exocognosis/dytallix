import { Navbar } from "./Navbar"
import { Footer } from "./Footer"

interface LayoutProps {
    children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="flex flex-col min-h-screen bg-transparent">
            <Navbar />
            <main className="flex-1 pt-16">
                {children}
            </main>
            <Footer />
        </div>
    )
}
