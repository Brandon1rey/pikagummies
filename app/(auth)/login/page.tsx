'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SpicyCard } from '@/components/ui/spicy-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, ChefHat, Lock, Mail } from 'lucide-react'
import { loginUser } from '@/app/actions/auth'

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        console.log('👆 [CLIENT] Submit Clicked')
        console.log('📦 [CLIENT] Payload prepared:', { email }) // Do not log password

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('email', email)
            formData.append('password', password)

            console.log('📡 [CLIENT] Sending request to server action...')
            const result = await loginUser(formData)
            console.log('📨 [CLIENT] Server Response:', result)

            if (result.success) {
                toast.success('Welcome back, Chef! 🌶️')
                console.log('🚀 [CLIENT] Redirecting to Dashboard...')
                router.push('/')
                router.refresh() // Ensure Sidebar updates
            } else {
                throw new Error(result.error || 'Login failed')
            }
        } catch (err: any) {
            console.error('💥 [CLIENT] Critical Failure:', err)
            if (err.message.includes('Email not confirmed')) {
                toast.error('Email not confirmed', {
                    description: 'Please check your inbox or ask an admin to disable email confirmation in Supabase settings.'
                })
            } else {
                toast.error(err.message || 'An error occurred during login')
            }
            setLoading(false)
        }
    }

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-orange-500/20 rounded-full">
                        <ChefHat className="h-12 w-12 text-orange-500" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                    Welcome to Pikagoma
                </h1>
                <p className="text-zinc-400">Enter your credentials to access the kitchen</p>
            </div>

            {/* Login Form */}
            <SpicyCard>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-zinc-300">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                            <Input
                                id="email"
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
                                id="password"
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

                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
                            onClick={() => toast.info('Password reset coming soon! 🔜')}
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <Button
                        id="login-button"
                        type="submit"
                        size="lg"
                        className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-6 text-lg shadow-lg shadow-orange-500/20"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Entering the Kitchen...
                            </>
                        ) : (
                            <>
                                <ChefHat className="mr-2 h-5 w-5" />
                                Enter the Kitchen
                            </>
                        )}
                    </Button>
                </form>
            </SpicyCard>

            {/* Debug Info */}
            <div className="text-center text-xs text-zinc-600">
                <p>🔍 Check browser console for detailed logs</p>
            </div>
        </div>
    )
}
