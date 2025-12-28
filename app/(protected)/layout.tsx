import Sidebar from "@/components/layout/Sidebar"
import { MobileSidebar } from "@/components/layout/MobileSidebar"
import { OrganizationThemeProvider } from "@/components/layout/theme-provider"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ThemeSettings {
    primaryColor: string
    backgroundColor?: string
    foregroundColor?: string
    accentColor?: string
}

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // 1. Fetch Settings for Theming
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Default theme (Intelligentia NegocIA Blue)
    let theme: ThemeSettings = {
        primaryColor: "#3b82f6",
        backgroundColor: "#0c0a09",
        foregroundColor: "#fafaf9"
    };

    if (user) {
        // Get the org ID from profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("organization_id")
            .eq("id", user.id)
            .single();

        if (profile?.organization_id) {
            const { data: settings } = await supabase
                .from("organization_settings")
                .select("theme_primary_color, theme_background, theme_foreground, theme_accent")
                .eq("organization_id", profile.organization_id)
                .single();

            if (settings) {
                theme = {
                    primaryColor: settings.theme_primary_color || theme.primaryColor,
                    backgroundColor: settings.theme_background || theme.backgroundColor,
                    foregroundColor: settings.theme_foreground || theme.foregroundColor,
                    accentColor: settings.theme_accent || undefined
                };
            }
        }
    }

    return (
        <OrganizationThemeProvider
            primaryColor={theme.primaryColor}
            backgroundColor={theme.backgroundColor}
            foregroundColor={theme.foregroundColor}
            accentColor={theme.accentColor}
        >
            <div className="flex h-screen w-full bg-background overflow-hidden">
                {/* Mobile Burger Menu */}
                <MobileSidebar>
                    <Sidebar />
                </MobileSidebar>

                {/* Fixed Sidebar - Desktop Only */}
                <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50 border-r border-white/10 bg-stone-950/50 backdrop-blur-xl">
                    <Sidebar />
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 md:pl-72 h-full overflow-y-auto relative">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none fixed" />
                    <div className="relative z-10 p-8 max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </OrganizationThemeProvider>
    )
}

