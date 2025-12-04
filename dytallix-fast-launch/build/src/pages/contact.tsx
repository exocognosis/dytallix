import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { Button } from "../components/ui/Button"
import { Mail, MessageSquare, MapPin } from "lucide-react"

export function Contact() {
    return (
        <Section title="Get in Touch" subtitle="Have questions? We'd love to hear from you.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                    <GlassPanel hoverEffect={true} className="p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Mail className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">Email Us</h3>
                            <p className="text-muted-foreground">hello@dytallix.com</p>
                        </div>
                    </GlassPanel>

                    <GlassPanel hoverEffect={true} className="p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <MessageSquare className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">Join Community</h3>
                            <p className="text-muted-foreground">discord.gg/dytallix</p>
                        </div>
                    </GlassPanel>

                    <GlassPanel hoverEffect={true} className="p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <MapPin className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">Headquarters</h3>
                            <p className="text-muted-foreground">San Francisco, CA</p>
                        </div>
                    </GlassPanel>
                </div>

                <GlassPanel className="p-8">
                    <form className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">First Name</label>
                                <input className="glass-input" placeholder="Jane" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Last Name</label>
                                <input className="glass-input" placeholder="Doe" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <input className="glass-input" type="email" placeholder="jane@example.com" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Message</label>
                            <textarea className="glass-input min-h-[120px] py-2" placeholder="How can we help you?" />
                        </div>

                        <Button className="w-full" size="lg">Send Message</Button>
                    </form>
                </GlassPanel>
            </div>
        </Section>
    )
}
