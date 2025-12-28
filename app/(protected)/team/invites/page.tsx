"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { InviteGenerator } from "@/components/team/invite-generator";
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from "@/components/ui/spicy-card";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function InvitesPage() {
    const supabase = createClient();
    const [invites, setInvites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdminAndFetch = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Get user's profile and org
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id, is_admin, role')
                    .eq('id', user.id)
                    .single();

                if (!profile?.organization_id) {
                    console.error("No organization found for user");
                    setLoading(false);
                    return;
                }

                setOrganizationId(profile.organization_id);
                setIsAdmin(profile.is_admin || profile.role === 'admin' || profile.role === 'owner');

                // Fetch Invites (scoped to user's org)
                const { data, error } = await supabase
                    .from('invites')
                    .select('*, creator:created_by(email), user:used_by(email)')
                    .eq('organization_id', profile.organization_id) // SCOPE TO ORG
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setInvites(data || []);
            } catch (e) {
                console.error("Fetch Invites Error:", e);
            } finally {
                setLoading(false);
            }
        };

        checkAdminAndFetch();
    }, []);

    if (loading) return <div className="text-center p-10 text-zinc-500">Loading access control...</div>;

    if (!organizationId) {
        return (
            <div className="text-center p-10 text-red-500">
                ⚠️ No organization found. Please contact support.
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="text-center p-10 text-yellow-500">
                ⚠️ Only Admins can manage invites.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Invite Management 🎟️</h1>
                <p className="text-muted-foreground">Generate and track team invites for your organization.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <InviteGenerator organizationId={organizationId} />
                </div>

                <div className="lg:col-span-2">
                    <SpicyCard>
                        <SpicyCardHeader>
                            <SpicyCardTitle>Invite History</SpicyCardTitle>
                        </SpicyCardHeader>
                        <SpicyCardContent>
                            <div className="space-y-4">
                                {invites.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No invites generated yet.</div>
                                ) : (
                                    invites.map((invite) => (
                                        <div key={invite.id} className="flex items-center justify-between p-3 bg-stone-900/50 rounded border border-white/5">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-sm font-mono text-purple-400">{invite.code}</code>
                                                    <Badge variant={invite.status === 'active' ? 'default' : 'secondary'} className={invite.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}>
                                                        {invite.status}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs border-white/10 text-zinc-400">
                                                        {invite.role_to_assign}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Created {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                                                </div>
                                            </div>
                                            <div className="text-right text-xs text-zinc-500">
                                                {invite.used_by ? (
                                                    <span className="text-green-500">Used by {invite.user?.email}</span>
                                                ) : (
                                                    <span>Unused</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </SpicyCardContent>
                    </SpicyCard>
                </div>
            </div>
        </div>
    );
}
