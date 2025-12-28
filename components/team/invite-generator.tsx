"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Loader2, Plus } from "lucide-react";
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from "@/components/ui/spicy-card";

interface InviteGeneratorProps {
    organizationId: string; // REQUIRED - Must be injected from parent
}

export function InviteGenerator({ organizationId }: InviteGeneratorProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState("");
    const [role, setRole] = useState("staff");

    const generateCode = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "PIKA-";
        for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        code += "-";
        for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        return code;
    };

    const handleCreateInvite = async () => {
        if (!organizationId) {
            toast.error("Organization context missing. Please refresh the page.");
            return;
        }

        setLoading(true);
        const code = generateCode();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Check if user is admin of this org
            const { data: profile } = await supabase
                .from("profiles")
                .select("is_admin, role, organization_id")
                .eq("id", user.id)
                .single();

            if (!profile) throw new Error("Profile not found");

            // Security: Verify they are admin AND belong to this org
            if (!profile.is_admin && profile.role !== 'admin' && profile.role !== 'owner') {
                throw new Error("Only Admins can create invites");
            }

            if (profile.organization_id !== organizationId) {
                throw new Error("You cannot create invites for other organizations");
            }

            const { error } = await supabase
                .from("invites")
                .insert({
                    code,
                    role_to_assign: role,
                    created_by: user.id,
                    status: 'active',
                    organization_id: organizationId // <-- THE FIX: Include org ID!
                });

            if (error) throw error;

            setGeneratedCode(code);
            toast.success("Invite code generated!");
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to create invite", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        const url = `${window.location.origin}/invite?code=${generatedCode}`;
        navigator.clipboard.writeText(url);
        toast.success("Invite link copied to clipboard!");
    };

    return (
        <SpicyCard>
            <SpicyCardHeader>
                <SpicyCardTitle>Generate New Invite</SpicyCardTitle>
            </SpicyCardHeader>
            <SpicyCardContent className="space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-sm text-muted-foreground mb-1 block">Role</label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="bg-stone-900 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="staff">Staff (General)</SelectItem>
                                <SelectItem value="sales">Sales Team</SelectItem>
                                <SelectItem value="logistics">Logistics</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="analyst">Analyst</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <Button
                            onClick={handleCreateInvite}
                            disabled={loading}
                            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Generate</>}
                        </Button>
                    </div>
                </div>

                {generatedCode && (
                    <div className="mt-6 p-4 bg-stone-900 rounded-lg border border-purple-500/30 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-2 block">
                            Share this code
                        </label>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm font-mono text-white tracking-wider bg-black/20 p-2 rounded text-center border border-white/5 break-all">
                                {`${typeof window !== 'undefined' ? window.location.origin : ''}/invite?code=${generatedCode}`}
                            </code>
                            <Button variant="outline" size="icon" onClick={copyToClipboard} className="border-white/10 hover:bg-white/5">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                            This code is active and can be used once.
                        </p>
                    </div>
                )}
            </SpicyCardContent>
        </SpicyCard>
    );
}
