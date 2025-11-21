import { Sidebar } from "@/components/layout/Sidebar"

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen w-full bg-stone-950 overflow-hidden">
            {/* Fixed Sidebar */}
            <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50 border-r border-white/10 bg-stone-950/50 backdrop-blur-xl">
                <Sidebar />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:pl-72 h-full overflow-y-auto relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/10 via-stone-950 to-stone-950 pointer-events-none fixed" />
                <div className="relative z-10 p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
