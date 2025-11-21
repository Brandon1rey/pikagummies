export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen w-full grid place-items-center bg-stone-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/20 via-stone-950 to-stone-950 pointer-events-none" />
            <div className="relative z-10 w-full max-w-md p-4">
                {children}
            </div>
        </div>
    )
}
