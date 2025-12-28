'use client'

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileSidebar({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Burger Menu Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-stone-900/90 backdrop-blur-sm border border-white/10 text-white hover:bg-stone-800 transition-colors"
                aria-label="Open menu"
            >
                <Menu className="h-6 w-6" />
            </button>

            {/* Overlay */}
            <div
                className={cn(
                    "md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsOpen(false)}
            />

            {/* Mobile Sidebar */}
            <aside
                className={cn(
                    "md:hidden fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out border-r border-white/10 bg-stone-950/95 backdrop-blur-xl",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Close Button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                    aria-label="Close menu"
                >
                    <X className="h-6 w-6" />
                </button>

                {/* Sidebar Content */}
                <div onClick={() => setIsOpen(false)} className="h-full">
                    {children}
                </div>
            </aside>
        </>
    )
}
