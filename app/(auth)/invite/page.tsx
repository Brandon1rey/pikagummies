'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SpicyCard } from '@/components/ui/spicy-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Ticket, ArrowRight, UserPlus, Lock, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function InvitePage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'code' | 'register'>('code')

    // Step 1: Invite Code
    const [inviteCode, setInviteCode] = useState('')
    const [inviteData, setInviteData] = useState<any>(null)

    // Step 2: Registration
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')

    const verifyCode = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteCode) return

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('invites')
                .select('*')
                .eq('code', inviteCode)
                .single()

            if (error || !data) throw new Error("Invalid invite code")
            if (data.status !== 'active' && data.status !== 'pending') throw new Error("This invite has already been used or expired")

            setInviteData(data)
            setStep('register')
            toast.success("Invite code verified! Welcome to the team.")
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // 1. Sign up the user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: inviteData.role_to_assign // Pass role metadata
                    }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error("Registration failed")

            // 2. Update the invite as used
            const { error: inviteError } = await supabase
                .from('invites')
                .update({
                    status: 'used',
                    used_by: authData.user.id
                })
                .eq('id', inviteData.id)

            if (inviteError) {
                console.error("Failed to mark invite as used:", inviteError)
                // Non-critical, but good to log
            }

            // 3. Create/Update Profile (if not handled by trigger, but let's be safe)
            // Assuming a trigger handles profile creation on auth.users insert, 
            // but we might want to ensure the role is set correctly if the trigger doesn't handle metadata.
            // For now, we'll trust the metadata or the trigger. 
            // If the trigger copies raw_user_meta_data->role to profiles.role, we are good.

            toast.success("Account created! Welcome aboard 🚀")
            router.push('/')
            router.refresh()

        } catch (err: any) {
            console.error(err)
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
