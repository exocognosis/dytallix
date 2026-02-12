import { Activity } from "lucide-react"
import { GlassPanel } from "./GlassPanel"

interface LiveLogPanelProps {
    logs: string[]
    title: string
    emptyMessage?: string
}

export function LiveLogPanel({ logs, title, emptyMessage = "Waiting for input...\n> _" }: LiveLogPanelProps) {
    return (
        <GlassPanel hoverEffect={true} className="p-0 overflow-hidden h-[500px] flex flex-col bg-black/80 font-mono text-sm border-white/10 h-full">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span className="font-bold text-green-400">{title}</span>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {logs.length === 0 ? (
                    <div className="text-muted-foreground italic opacity-50" style={{ whiteSpace: "pre-line" }}>
                        {emptyMessage}
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-white/30 select-none">{">"}</span>
                            <span className={
                                log.includes("ERROR") ? "text-red-400" :
                                    log.includes("SUCCESS") ? "text-green-400 font-bold" :
                                        log.includes("Tx Hash") ? "text-blue-400" :
                                            "text-gray-300"
                            }>
                                {log}
                            </span>
                        </div>
                    ))
                )}
                <div className="h-0" />
            </div>
        </GlassPanel>
    )
}
