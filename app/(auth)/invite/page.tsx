'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SpicyCard } from '@/components/ui/spicy-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Ticket, ArrowRight, UserPlus, Lock, Mail, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function InvitePageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'code' | 'register'>('code')

    // Step 1: Invite Code
    const [inviteCode, setInviteCode] = useState('')
    const [inviteData, setInviteData] = useState<any>(null)
    const [existingOrgWarning, setExistingOrgWarning] = useState<string | null>(null)

    // Step 2: Registration
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('') // NEW: Phone for Ops Bot

    // Auto-fill code from URL
    useEffect(() => {
        const codeFromUrl = searchParams.get('code')
        if (codeFromUrl) {
            setInviteCode(codeFromUrl)
        }
    }, [searchParams])

    const verifyCode = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!inviteCode) return

        setLoading(true)
        try {
            // Check current user status first
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
                if (profile?.organization_id) {
                    setExistingOrgWarning("You are already part of an organization. Accepting this will switch you to the new one.")
                }
            }

            const { data, error } = await supabase
                .from('invites')
                .select('*')
                .eq('code', inviteCode)
                .single()

            if (error || !data) throw new Error("Invalid invite code")
            if (data.status !== 'active' && data.status !== 'pending') throw new Error("This invite has already been used or expired")

            setInviteData(data)
            setStep('register')
            toast.success("Invite code verified!")
        } catch (err: any) {
            console.error("Verify Error:", err)
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let userId = (await supabase.auth.getUser()).data.user?.id

            // 1. Sign up OR Use Existing
            if (!userId) {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            role: inviteData.role_to_assign,
                            phone: phone
                        }
                    }
                })
                if (authError) throw authError
                if (!authData.user) throw new Error("Registration failed")
                userId = authData.user.id
            }

            const orgId = inviteData.organization_id

            // 3. CRITICAL: Update profile with org_id and phone (The "Switch")
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    organization_id: orgId,
                    role: inviteData.role_to_assign, // Migration: this assumes 'owner', 'admin', 'staff' matches DB enum
                    phone: phone || undefined,   // Update phone if provided
                    tags: [] // CLEAR TAGS on switch
                })
                .eq('id', userId)

            if (profileError) {
                console.error("Failed to update profile:", profileError)
                throw new Error("Failed to join organization")
            }

            // 4. Update the invite as used
            const { error: inviteError } = await supabase
                .from('invites')
                .update({
                    status: 'used',
                    used_by: userId
                })
                .eq('id', inviteData.id)

            if (inviteError) {
                console.error("Failed to mark invite as used:", inviteError)
            }

            toast.success("Welcome to the team! Organization switched.")
            router.push('/')
            router.refresh()

        } catch (err: any) {
            console.error("Registration Error:", err)
            toast.error(err.message || "Registration failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-purple-500/20 rounded-full">
                        <Ticket className="h-12 w-12 text-purple-500" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">
                    Have an Invite?
                </h1>
                <p className="text-zinc-400">Join the Pikagoma team.</p>
            </div>

            <SpicyCard>
                {step === 'code' ? (
                    <form onSubmit={verifyCode} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Enter Invite Code</Label>
                            <div className="relative">
                                <Ticket className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                                <Input
                                    placeholder="PIKA-XXXX-XXXX"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                    className="bg-black/20 border-white/10 text-white pl-10 font-mono tracking-wider"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                            disabled={loading || !inviteCode}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <><ArrowRight className="mr-2 h-4 w-4" /> Verify Code</>}
                        </Button>
                        <div className="text-center">
                            <a href="/login" className="text-sm text-zinc-500 hover:text-white transition-colors">
                                Already have an account? Login
                            </a>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-6 animate-in slide-in-from-right duration-300">
                        {existingOrgWarning && (
                            <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-200 text-sm mb-4">
                                <strong>Warning:</strong> You are already part of an organization. Accepting this invite will remove you from your current team.
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Full Name</Label>
                            <div className="relative">
                                <UserPlus className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                                <Input
                                    placeholder="Chef Gordon"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white pl-10"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-300">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                                <Input
                                    type="email"
                                    placeholder="chef@pikagoma.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white pl-10"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* NEW: Phone Number for Ops Bot */}
                        <div className="space-y-2">
                            <Label className="text-zinc-300">WhatsApp Phone (for Ops Bot)</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                                <Input
                                    type="tel"
                                    placeholder="+521XXXXXXXXXX"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white pl-10"
                                    disabled={loading}
                                />
                            </div>
                            <p className="text-xs text-zinc-500">E.164 format. Used to interact with the Ops Bot.</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-300">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white pl-10"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded text-sm text-purple-300 text-center">
                            Joining as: <span className="font-bold uppercase">{inviteData.role_to_assign}</span>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Create Account"}
                        </Button>
                    </form>
                )}
            </SpicyCard>
        </div>
    )
}

export default function InvitePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin h-8 w-8 text-purple-500" /></div>}>
            <InvitePageContent />
        </Suspense>
    )
}
