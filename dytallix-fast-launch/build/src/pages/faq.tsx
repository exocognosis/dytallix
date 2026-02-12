import { useState } from "react"
import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { ChevronDown, ShieldCheck } from "lucide-react"

import { faqData } from "../data/faq"
import type { FAQItem } from "../data/faq"

function FAQAccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
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
                    <p className="text-muted-foreground leading-relaxed">
                        {item.answer}
                    </p>
                </div>
            </div>
        </GlassPanel>
    )
}

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <Section
            title="Frequently Asked Questions"
            subtitle="Common questions about Dytallix, quantum-resistant cryptography, and our approach to building secure infrastructure."
        >
            <div className="max-w-4xl mx-auto space-y-4">
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
