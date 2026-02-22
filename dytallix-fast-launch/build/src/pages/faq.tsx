import { useState } from "react"
import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { ChevronDown, ShieldCheck } from "lucide-react"

import { dytallixFaqData, quantumVaultFaqData } from "../data/faq"
import type { FAQItem } from "../data/faq"

function getAnswerParagraphs(answer: string): string[] {
    if (answer.length < 420) {
        return [answer]
    }

    const sentences = answer.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()) ?? [answer]
    const paragraphs: string[] = []

    for (let index = 0; index < sentences.length; index += 2) {
        paragraphs.push(sentences.slice(index, index + 2).join(" "))
    }

    return paragraphs
}

function FAQAccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
    const answerParagraphs = getAnswerParagraphs(item.answer)

    return (
        <GlassPanel className="overflow-hidden" hoverEffect={!isOpen}>
            <button
                onClick={onToggle}
                className="w-full p-6 text-left flex items-start gap-4 group"
            >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                    <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-grow">
                    <h3 className="font-bold text-lg pr-8 group-hover:text-primary/90 transition-colors">
                        {item.question}
                    </h3>
                </div>
                <ChevronDown
                    className={`h-5 w-5 shrink-0 mt-2 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="px-6 pb-6 pl-20">
                    <div className="space-y-3">
                        {answerParagraphs.map((paragraph, index) => (
                            <p key={index} className="text-muted-foreground leading-relaxed">
                                {paragraph}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </GlassPanel>
    )
}

export function FAQ() {
    const [activeFaq, setActiveFaq] = useState<"dytallix" | "quantumvault">("dytallix")
    const [openIndex, setOpenIndex] = useState<number | null>(null)
    const faqData = activeFaq === "dytallix" ? dytallixFaqData : quantumVaultFaqData

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    const handleFaqSwitch = (value: "dytallix" | "quantumvault") => {
        setActiveFaq(value)
        setOpenIndex(null)
    }

    return (
        <Section
            title="Frequently Asked Questions"
            subtitle="Switch between Dytallix and QuantumVault FAQs to view product-specific answers."
        >
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 p-1 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                        <button
                            type="button"
                            onClick={() => handleFaqSwitch("dytallix")}
                            aria-pressed={activeFaq === "dytallix"}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                activeFaq === "dytallix"
                                    ? "bg-primary text-primary-foreground shadow"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Dytallix FAQ
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFaqSwitch("quantumvault")}
                            aria-pressed={activeFaq === "quantumvault"}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                activeFaq === "quantumvault"
                                    ? "bg-primary text-primary-foreground shadow"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            QuantumVault FAQ
                        </button>
                    </div>
                </div>

                {faqData.length === 0 && (
                    <GlassPanel className="p-6 text-center">
                        <p className="text-muted-foreground">
                            QuantumVault FAQ content will appear here once questions and answers are added.
                        </p>
                    </GlassPanel>
                )}

                {faqData.map((item, index) => (
                    <FAQAccordionItem
                        key={index}
                        item={item}
                        isOpen={openIndex === index}
                        onToggle={() => handleToggle(index)}
                    />
                ))}
            </div>
        </Section>
    )
}
