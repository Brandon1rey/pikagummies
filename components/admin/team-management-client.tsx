'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from '@/components/ui/spicy-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Users, Trash2, Phone, Shield, Save } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Member {
    user_id: string
    role: string
    profiles: {
        id: string
        full_name: string | null
        email: string | null
        phone: string | null
        avatar_url: string | null
    }
}

interface TeamManagementClientProps {
    organizationId: string
    members: Member[]
    currentUserRole: string
    currentUserId: string
}

const ROLE_OPTIONS = [
    { value: 'admin', label: 'Admin', description: 'Full access, can manage team' },
    { value: 'production', label: 'Production', description: 'Can delete products/materials' },
    { value: 'staff', label: 'Staff', description: 'Basic access' },
]

export function TeamManagementClient({
    organizationId,
    members: initialMembers,
    currentUserRole,
    currentUserId
}: TeamManagementClientProps) {
    const supabase = createClient()
    const [members, setMembers] = useState(initialMembers)
    const [editingMember, setEditingMember] = useState<string | null>(null)
    const [editRole, setEditRole] = useState('')
    const [editPhone, setEditPhone] = useState('')
    const [saving, setSaving] = useState(false)
    const [removing, setRemoving] = useState<string | null>(null)

    const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

    const handleEditStart = (member: Member) => {
        setEditingMember(member.user_id)
        setEditRole(member.role)
        setEditPhone(member.profiles.phone || '')
    }

    const handleSave = async (member: Member) => {
        setSaving(true)
        try {
            // Update role if changed
            if (editRole !== member.role) {
                const { data, error } = await supabase.rpc('update_org_member_role', {
                    p_member_user_id: member.user_id,
                    p_new_role: editRole,
                    p_organization_id: organizationId
                })
                if (error) throw error
                const result = data as { status: string; message?: string }
                if (result.status === 'error') throw new Error(result.message)
            }

            // Update phone if changed
            if (editPhone !== (member.profiles.phone || '')) {
                const { data, error } = await supabase.rpc('update_org_member_phone', {
                    p_member_user_id: member.user_id,
                    p_phone: editPhone,
                    p_organization_id: organizationId
                })
                if (error) throw error
                const result = data as { status: string; message?: string }
                if (result.status === 'error') throw new Error(result.message)
            }

            // Update local state
            setMembers(prev => prev.map(m =>
                m.user_id === member.user_id
                    ? { ...m, role: editRole, profiles: { ...m.profiles, phone: editPhone } }
                    : m
            ))

            toast.success('Member updated')
            setEditingMember(null)
        } catch (error: any) {
            toast.error(error.message || 'Failed to update member')
        } finally {
            setSaving(false)
        }
    }

    const handleRemove = async (member: Member) => {
        setRemoving(member.user_id)
        try {
            const { data, error } = await supabase.rpc('remove_org_member', {
                p_member_user_id: member.user_id,
                p_organization_id: organizationId
            })
            if (error) throw error
            const result = data as { status: string; message?: string }
            if (result.status === 'error') throw new Error(result.message)

            setMembers(prev => prev.filter(m => m.user_id !== member.user_id))
            toast.success('Member removed from organization')
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove member')
        } finally {
            setRemoving(null)
        }
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            case 'admin': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'production': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            default: return 'bg-stone-500/20 text-stone-400 border-stone-500/30'
        }
    }

    return (
        <SpicyCard>
            <SpicyCardHeader>
                <SpicyCardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Members ({members.length})
                </SpicyCardTitle>
            </SpicyCardHeader>
            <SpicyCardContent>
                <div className="space-y-4">
                    {members.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No team members found.</p>
                    ) : (
                        members.map(member => (
                            <div
                                key={member.user_id}
                                className="flex items-center justify-between p-4 rounded-lg bg-stone-900/50 border border-white/5"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                        {member.profiles.full_name?.[0] || 'U'}
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <p className="font-medium text-white">
                                            {member.profiles.full_name || 'Unknown'}
                                            {member.user_id === currentUserId && (
                                                <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                                            )}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Role Badge or Editor */}
                                    {editingMember === member.user_id ? (
                                        <div className="flex items-center gap-2">
                                            <Select value={editRole} onValueChange={setEditRole}>
                                                <SelectTrigger className="w-[140px] bg-stone-800 border-white/10">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ROLE_OPTIONS.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                value={editPhone}
                                                onChange={(e) => setEditPhone(e.target.value)}
                                                placeholder="Phone"
                                                className="w-[140px] bg-stone-800 border-white/10"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => handleSave(member)}
                                                disabled={saving}
                                            >
                                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setEditingMember(null)}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Phone */}
                                            {member.profiles.phone && (
                                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {member.profiles.phone}
                                                </span>
                                            )}

                                            {/* Role Badge */}
                                            <span className={`px-2 py-1 text-xs rounded-full border capitalize ${getRoleBadgeColor(member.role)}`}>
                                                {member.role}
                                            </span>

                                            {/* Actions - Only for non-owners and non-self */}
                                            {canManage && member.role !== 'owner' && member.user_id !== currentUserId && (
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEditStart(member)}
                                                    >
                                                        <Shield className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-stone-950 border-white/10">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will remove {member.profiles.full_name} from your organization.
                                                                    They will lose access to all organization data.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleRemove(member)}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                >
                                                                    {removing === member.user_id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : 'Remove'}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </SpicyCardContent>
        </SpicyCard>
    )
}
