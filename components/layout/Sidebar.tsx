'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, UtensilsCrossed, ShoppingBasket, DollarSign, Users, CreditCard, LogOut, ChefHat, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
        color: "text-sky-500",
    },
    {
        label: "Pantry",
        icon: ShoppingBasket,
        href: "/pantry",
        color: "text-emerald-500",
    },
    {
        label: "Kitchen",
        icon: ChefHat,
        href: "/kitchen",
        color: "text-orange-500",
    },
    {
        label: "Sales",
        icon: DollarSign,
        href: "/sales",
        color: "text-green-500",
    },
    {
        label: "Expenses",
        icon: CreditCard,
        href: "/expenses",
        color: "text-red-500",
    },
    {
        label: "Team",
        icon: Users,
        href: "/team",
        color: "text-violet-500",
    },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [profile, setProfile] = useState<any>(null)
    const supabase = createClient()

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()
                setProfile(data)
            }
        }
        getProfile()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        toast.success("Logged out successfully")
    }

    return (
        <div className="space-y-4 py-4 flex flex-col h-full text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/" className="flex items-center pl-3 mb-14">
                    <div className="relative h-8 w-8 mr-4">
                        <UtensilsCrossed className="h-8 w-8 text-orange-500" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                        Pikagoma
                    </h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname === route.href ? "text-white bg-white/10 border-r-2 border-orange-500" : "text-zinc-400"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}

                    {/* Invites - Accessible to all */}
                    <Link
                        href="/team/invites"
                        className={cn(
                            "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                            pathname === "/team/invites" ? "text-white bg-white/10 border-r-2 border-purple-500" : "text-zinc-400"
                        )}
                    >
                        <div className="flex items-center flex-1">
                            <div className="h-5 w-5 mr-3 flex items-center justify-center">
                                <span className="text-lg">🎟️</span>
                            </div>
                            Invites
                        </div>
                    </Link>
                </div>
            </div>

            {/* User Profile Section */}
            <div className="px-3 py-2 border-t border-white/10">
                <Link href="/team/profile">
                    <div className={cn(
                        "flex items-center gap-x-3 mb-4 p-2 rounded-lg transition cursor-pointer",
                        pathname === "/team/profile" ? "bg-white/10" : "hover:bg-white/5"
                    )}>
                        {profile ? (
                            <>
                                <Avatar>
                                    <AvatarImage src={profile.avatar_url} />
                                    <AvatarFallback className="bg-orange-500/20 text-orange-500">
                                        {profile.full_name?.[0] || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col overflow-hidden">
                                    <p className="text-sm font-medium text-white truncate">
                                        {profile.full_name || 'User'}
                                    </p>
                                    <p className="text-xs text-zinc-400 truncate">
                                        {profile.role}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="h-10 w-full bg-white/5 animate-pulse rounded-lg" />
                        )}
                    </div>
                </Link>

                <button
                    onClick={handleLogout}
                    className="text-sm group flex p-3 w-full justify-start font-medium cursor-pointer text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                >
                    <div className="flex items-center flex-1">
                        <LogOut className="h-5 w-5 mr-3" />
                        Logout
                    </div>
                </button>
            </div>
        </div>
    )
}
