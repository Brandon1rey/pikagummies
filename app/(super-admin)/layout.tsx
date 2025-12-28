import { isSuperAdmin } from '@/lib/auth/super-admin'
import { redirect } from 'next/navigation'

export default async function SuperAdminLayout({
    children
}: {
    children: React.ReactNode
}) {
    const isAllowed = await isSuperAdmin()

    if (!isAllowed) {
        // Non-super-admins get kicked back to their tenant dashboard
        redirect('/dashboard')
    }

    return (
        <div className="super-admin-wrapper">
            <div className="bg-red-900/20 border-b border-red-500/30 px-4 py-2">
                <p className="text-red-400 text-sm font-mono">
                    🔒 Super Admin Mode - Platform Owner Access
                </p>
            </div>
            {children}
        </div>
    )
}
