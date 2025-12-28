'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SpicyCard } from '@/components/ui/spicy-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Brain, Lock, Mail, BarChart3, Shield } from 'lucide-react'
import { loginUser } from '@/app/actions/auth'

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        console.log('👆 [CLIENT] Submit Clicked')
        console.log('📦 [CLIENT] Payload prepared:', { email })

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('email', email)
            formData.append('password', password)

            console.log('📡 [CLIENT] Sending request to server action...')
            const result = await loginUser(formData)
            console.log('📨 [CLIENT] Server Response:', result)

            if (result.success) {
                toast.success('Welcome back!')
                console.log('🚀 [CLIENT] Redirecting to Dashboard...')
                router.push('/')
                router.refresh()
            } else {
                throw new Error(result.error || 'Login failed')
            }
        } catch (err: unknown) {
            console.error('💥 [CLIENT] Critical Failure:', err)
            const errorMessage = err instanceof Error ? err.message : 'An error occurred during login'
            if (errorMessage.includes('Email not confirmed')) {
                toast.error('Email not confirmed', {
                    description: 'Please check your inbox or ask an admin to disable email confirmation in Supabase settings.'
                })
            } else {
                toast.error(errorMessage)
            }
            setLoading(false)
        }
    }

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-blue-500/20 rounded-full">
                        <Brain className="h-12 w-12 text-blue-400" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                    Intelligentia NegocIA
                </h1>
                <p className="text-slate-400">Una solución de IA para su negocio.</p>
            </div>

            {/* Feature Pills */}
            <div className="flex justify-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700">
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-slate-300">Analytics</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700">
                    <Brain className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs text-slate-300">AI Powered</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-slate-300">Secure</span>
                </div>
            </div>

            {/* Login Form */}
            <SpicyCard className="border-slate-700 bg-slate-900/50 backdrop-blur-sm">
                <form onSubmit={handleLogin} className="space-y-6 p-6">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-slate-950/50 border-slate-700 text-white pl-10 focus:border-blue-500 focus:ring-blue-500/20"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-slate-950/50 border-slate-700 text-white pl-10 focus:border-blue-500 focus:ring-blue-500/20"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            onClick={() => toast.info('Password reset coming soon!')}
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <Button
                        id="login-button"
                        type="submit"
                        size="lg"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-6 text-lg shadow-lg shadow-blue-500/20"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                <Brain className="mr-2 h-5 w-5" />
                                Sign In
                            </>
                        )}
                    </Button>
                </form>
            </SpicyCard>

            {/* Footer */}
            <p className="text-center text-xs text-slate-600">
                Powered by Intelligentia NegocIA © {new Date().getFullYear()}
            </p>
        </div>
    )
}
