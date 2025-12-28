import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import {
    LayoutDashboard,
    ChefHat,
    ShoppingCart,
    Package,
    DollarSign,
    Users,
    ShieldCheck,
    User,
    Tag,
    LogOut,
    Settings,
    Crown,
    FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

// Define the shape of our dynamic terminology
interface Terminology {
    kitchen: string;
    pantry: string;
    recipes: string;
    production: string;
}

const defaultTerms: Terminology = {
    kitchen: "Kitchen",
    pantry: "Pantry",
    recipes: "Recipes",
    production: "Production"
};

export default async function Sidebar() {
    const supabase = await createClient();

    // 1. Get Current User safely
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if user is platform admin (god mode)
    const isPlatformAdmin = await isSuperAdmin();

    // 2. Fetch Profile & Org Data
    // We need to JOIN the organization table to get the name
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(`
            *,
            organizations ( name ) 
        `)
        .eq("id", user.id)
        .single();

    console.log("--- SIDEBAR DEBUG ---");
    console.log("User ID:", user.id);
    console.log("Profile Error:", profileError);
    console.log("Profile Data:", profile);
    console.log("Org Data (Nested):", profile?.organizations);
    console.log("---------------------");

    // 3. Fetch Settings (Separate query for cleanliness)
    let settings = null;
    if (profile?.organization_id) {
        const { data } = await supabase
            .from("organization_settings")
            .select("*")
            .eq("organization_id", profile.organization_id)
            .single();
        settings = data;
    }

    // 4. Determine Branding
    const companyName = (profile?.organizations as { name?: string })?.name || "NegocIA";

    // 5. Define Menu with Logic
    const terms = (settings?.terminology as Terminology | undefined) || defaultTerms;

    const menuItems = [
        { label: "Dashboard", href: "/", icon: LayoutDashboard, visible: true },
        // Inventory is usually core, but we can check module_inventory if we want. 
        // For now, we assume "Simple Stock" implies Inventory is ON.
        { label: terms.pantry, href: "/pantry", icon: Package, visible: settings?.module_inventory !== false },

        // Kitchen & Recipes are ONLY for Crafting
        { label: terms.kitchen, href: "/kitchen", icon: ChefHat, visible: settings?.module_production === true },

        // Pricing is for EVERYONE now (User Request)
        { label: "Pricing", href: "/pricing", icon: Tag, visible: true },

        { label: "Sales", href: "/sales", icon: ShoppingCart, visible: true },
        { label: "Expenses", href: "/expenses", icon: DollarSign, visible: true },
        { label: "Reportes", href: "/reports", icon: FileText, visible: true },
        { label: "Team", href: "/team", icon: Users, visible: settings?.module_team !== false },
        { label: "Invites", href: "/team/invites", icon: Users, visible: settings?.module_team !== false && (profile?.role === 'owner' || profile?.role === 'admin') },
        { label: "Profile", href: "/team/profile", icon: User, visible: true },
    ];

    return (
        <div className="flex h-full w-64 flex-col bg-stone-950 text-white border-r border-stone-800">
            {/* Header */}
            <div className="flex h-16 items-center px-6 border-b border-stone-800">
                <span className="text-xl font-bold text-primary truncate">
                    {companyName}
                </span>
            </div>

            {/* Nav Items */}
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-4">
                    {menuItems.filter(item => item.visible).map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                "text-stone-400 hover:bg-stone-900 hover:text-orange-500"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    ))}

                    {/* ADMIN ZONE - For org admins */}
                    {(profile?.role === 'owner' || profile?.role === 'admin') && (
                        <div className="pt-8 mt-4 border-t border-stone-800">
                            <p className="px-3 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                                Admin Zone
                            </p>
                            <Link
                                href="/admin/settings"
                                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-blue-400 hover:bg-blue-950/30 hover:text-blue-300"
                            >
                                <Settings className="h-5 w-5" />
                                Appearance
                            </Link>
                            <Link
                                href="/admin/team"
                                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-400 hover:bg-stone-900 hover:text-white"
                            >
                                <Users className="h-5 w-5" />
                                Team Management
                            </Link>
                        </div>
                    )}

                    {/* PLATFORM ADMIN - Only for god mode */}
                    {isPlatformAdmin && (
                        <div className="pt-4 mt-4 border-t border-red-900/30">
                            <p className="px-3 text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">
                                🔒 Platform Owner
                            </p>
                            <Link
                                href="/tenants"
                                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300"
                            >
                                <Crown className="h-5 w-5" />
                                God Mode
                            </Link>
                        </div>
                    )}
                </nav>
            </div>

            {/* Footer with User Info and Logout */}
            <div className="border-t border-stone-800 p-4 bg-stone-925 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-500 font-bold">
                        {profile?.full_name?.[0] || "U"}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium text-white truncate">{profile?.full_name}</span>
                        <span className="text-xs text-stone-500 capitalize">{profile?.role}</span>
                    </div>
                </div>

                {/* Logout Button */}
                <form action={signOut}>
                    <Button
                        type="submit"
                        variant="ghost"
                        className="w-full justify-start text-stone-400 hover:text-red-400 hover:bg-red-950/20"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </form>
            </div>
        </div>
    );
}