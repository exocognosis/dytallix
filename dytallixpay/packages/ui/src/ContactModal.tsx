import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { X, Loader2, CheckCircle, Mail } from "lucide-react"
import { GlassPanel } from "./GlassPanel"
import { Button } from "./Button"
import { cn } from "../../utils"

interface ContactModalProps {
    isOpen: boolean
    onClose: () => void
    source?: string
    title?: string
    subtitle?: string
}

export function ContactModal({
    isOpen,
    onClose,
    source = "unknown",
    title = "Get in Touch",
    subtitle = "We'll get back to you within 24 hours."
}: ContactModalProps) {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [company, setCompany] = useState("")
    const [message, setMessage] = useState("")
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
    const [errorMessage, setErrorMessage] = useState("")

    const apiUrl = useMemo(() => {
        if (typeof window !== 'undefined' && window.location.hostname.includes('dytallix.com')) {
            return '';  // Use relative URL in production
        }
        return import.meta.env.VITE_API_URL || '';
    }, [])

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setName("")
                setEmail("")
                setCompany("")
                setMessage("")
                setStatus("idle")
                setErrorMessage("")
            }, 300)
        }
    }, [isOpen])

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus("submitting")
        setErrorMessage("")

        try {
            const response = await fetch(`${apiUrl}/api/contact/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    company: company.trim() || undefined,
                    message: message.trim() || undefined,
                    source
                })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setStatus("success")
            } else {
                throw new Error(data.message || data.error || 'Failed to submit')
            }
        } catch (error) {
            setStatus("error")
            setErrorMessage(error instanceof Error ? error.message : 'Failed to submit. Please try again.')
        }
    }

    if (!isOpen) return null

    return (
        <div
            className={cn(
                "fixed inset-0 z-50 flex items-center justify-center p-4",
                "bg-black/60 backdrop-blur-sm",
                "animate-in fade-in duration-200"
            )}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <GlassPanel
                variant="dark"
                className={cn(
                    "relative w-full max-w-md p-8",
                    "animate-in zoom-in-95 slide-in-from-bottom-4 duration-300",
                    "border-white/20"
                )}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {status === "success" ? (
                    // Success State
                    <div className="text-center space-y-6 py-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
                            <p className="text-muted-foreground">
                                We've received your message and will be in touch shortly.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="mt-4"
                        >
                            Close
                        </Button>
                    </div>
                ) : (
                    // Form State
                    <>
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                                <Mail className="w-6 h-6 text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">{title}</h2>
                            <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium text-white">
                                    Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={status === "submitting"}
                                    placeholder="Your name"
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-white">
                                    Email <span className="text-red-400">*</span>
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={status === "submitting"}
                                    placeholder="you@company.com"
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="company" className="text-sm font-medium text-white">
                                    Company <span className="text-muted-foreground">(optional)</span>
                                </label>
                                <input
                                    id="company"
                                    type="text"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    disabled={status === "submitting"}
                                    placeholder="Your company"
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium text-white">
                                    Message <span className="text-muted-foreground">(optional)</span>
                                </label>
                                <textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={status === "submitting"}
                                    placeholder="Tell us about your needs..."
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all resize-none disabled:opacity-50"
                                />
                            </div>

                            {status === "error" && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {errorMessage}
                                </div>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                disabled={status === "submitting"}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {status === "submitting" ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    "Send Message"
                                )}
                            </Button>
                        </form>
                    </>
                )}
            </GlassPanel>
        </div>
    )
}
