"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Loader2, Plus, RefreshCw } from "lucide-react";
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from "@/components/ui/spicy-card";

export function InviteGenerator() {
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
        setLoading(true);
        const code = generateCode();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("invites")
                .insert({
                    code,
                    role_to_assign: role,
                    created_by: user.id,
                    status: 'active'
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
        navigator.clipboard.writeText(generatedCode);
        toast.success("Copied to clipboard!");
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
                                <SelectItem value="staff">Staff</SelectItem>
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
                            <code className="flex-1 text-2xl font-mono text-white tracking-wider bg-black/20 p-2 rounded text-center border border-white/5">
                                {generatedCode}
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
