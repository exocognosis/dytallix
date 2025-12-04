import { Link, useLocation } from "react-router-dom"
import { useTheme } from "../../contexts/theme-provider"
import { Button } from "../ui/Button"
import { Sun, Moon, Menu, X } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "../../utils"

export function Navbar() {
    const { theme, setTheme } = useTheme()
    const location = useLocation()
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const navLinks = [
        { name: "Home", path: "/" },
        { name: "Build", path: "/build" },
        { name: "Enterprise", path: "/enterprise" },
        { name: "Network", path: "/build/blockchain" },
        { name: "Technology", path: "/tech-stack" },
        { name: "Risk Analysis", path: "/quantum-risk" },
    ]

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-[100] w-full transition-all duration-300 border-b border-transparent",
                {
                    "bg-white/10 dark:bg-black/40 backdrop-blur-md border-white/10 dark:border-white/5 shadow-sm": isScrolled,
                    "bg-transparent": !isScrolled,
                }
            )}
        >
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg group-hover:shadow-primary/20 transition-all">
                        D
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        Dytallix
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center justify-center flex-1 gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary relative py-1",
                                location.pathname === link.path
                                    ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded-full"
                                    : "text-muted-foreground"
                            )}
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="rounded-full hover:bg-white/10 dark:hover:bg-white/5"
                    >
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/build">Build on Dytallix</Link>
                        </Button>
                        <Button size="sm" className="shadow-lg shadow-primary/20" asChild>
                            <Link to="/enterprise">Secure with QuantumVault</Link>
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu Toggle */}
                <div className="flex md:hidden items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="rounded-full"
                    >
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X /> : <Menu />}
                    </Button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-16 left-0 w-full bg-background/95 backdrop-blur-xl border-b border-border p-4 flex flex-col gap-4 shadow-2xl animate-slide-up">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                                "text-lg font-medium py-2 px-4 rounded-lg transition-colors",
                                location.pathname === link.path
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                        <Button variant="outline" className="w-full justify-start" asChild onClick={() => setIsMobileMenuOpen(false)}>
                            <Link to="/build">Build on Dytallix</Link>
                        </Button>
                        <Button className="w-full justify-start" asChild onClick={() => setIsMobileMenuOpen(false)}>
                            <Link to="/enterprise">Secure with QuantumVault</Link>
                        </Button>
                    </div>
                </div>
            )}
        </header>
    )
}
