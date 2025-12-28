'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { SpicyCard, SpicyCardHeader, SpicyCardTitle, SpicyCardContent } from "@/components/ui/spicy-card"
import { toast } from "sonner"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Copy, Check, Smartphone } from "lucide-react"

export default function ProfilePage() {
    const supabase = createClient()
    const router = useRouter()
    const [uploading, setUploading] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const [phone, setPhone] = useState<string | null>(null)
    const [fullName, setFullName] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [telegramLinked, setTelegramLinked] = useState(false)

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserId(user.id)

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('phone, full_name, telegram_id')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setPhone(profile.phone)
                    setFullName(profile.full_name)
                    setTelegramLinked(!!profile.telegram_id)
                }
            }
        }
        fetchProfile()
    }, [])

    const copyUserId = () => {
        if (userId) {
            navigator.clipboard.writeText(userId)
            setCopied(true)
            toast.success("User ID copiado!")
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!e.target.files || e.target.files.length === 0) {
                throw new Error('You must select an image to upload.')
            }

            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error("Not authenticated")

            const path = `${user.id}/${Math.random()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(path, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(path)

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)

            if (updateError) throw updateError

            toast.success("Avatar updated!")
            router.refresh()

        } catch (error: any) {
            console.error(error)
            toast.error(error.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="space-y-4">
            <SpicyCard>
                <SpicyCardHeader>
                    <SpicyCardTitle>Mi Perfil</SpicyCardTitle>
                </SpicyCardHeader>
                <SpicyCardContent>
                    <div className="flex flex-col items-center gap-4">
                        <label className="cursor-pointer group relative">
                            <Avatar className="w-24 h-24 border-2 border-orange-500/50 group-hover:border-orange-500 transition-all">
                                <AvatarImage src="" />
                                <AvatarFallback>{fullName?.charAt(0) || 'ME'}</AvatarFallback>
                            </Avatar>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleUpload}
                                disabled={uploading}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white">
                                {uploading ? '...' : 'Upload'}
                            </div>
                        </label>
                        <p className="text-stone-400 text-sm">Click avatar to upload</p>
                    </div>
                </SpicyCardContent>
            </SpicyCard>

            {/* Telegram Linking Section */}
            <SpicyCard>
                <SpicyCardHeader>
                    <SpicyCardTitle className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5" />
                        Vincular Telegram
                    </SpicyCardTitle>
                </SpicyCardHeader>
                <SpicyCardContent>
                    <div className="space-y-4">
                        {telegramLinked ? (
                            <div className="flex items-center gap-2 text-green-400">
                                <Check className="w-5 h-5" />
                                <span>Tu cuenta de Telegram está vinculada</span>
                            </div>
                        ) : (
                            <>
                                <p className="text-stone-400 text-sm">
                                    Para usar el bot de Telegram, necesitas vincular tu cuenta.
                                    Copia tu User ID y número telefónico, luego envía <code className="bg-stone-800 px-1 rounded">/vincular</code> al bot.
                                </p>

                                {/* User ID */}
                                <div className="space-y-1">
                                    <label className="text-xs text-stone-500 uppercase">Tu User ID</label>
                                    <div
                                        onClick={copyUserId}
                                        className="flex items-center gap-2 bg-stone-800/50 border border-stone-700 rounded-lg p-3 cursor-pointer hover:bg-stone-800 transition-colors"
                                    >
                                        <code className="flex-1 text-orange-400 text-sm font-mono truncate">
                                            {userId || 'Cargando...'}
                                        </code>
                                        {copied ? (
                                            <Check className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-stone-400 hover:text-white" />
                                        )}
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="space-y-1">
                                    <label className="text-xs text-stone-500 uppercase">Tu Teléfono</label>
                                    <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-3">
                                        <code className="text-orange-400 text-sm font-mono">
                                            {phone || 'No registrado'}
                                        </code>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </SpicyCardContent>
            </SpicyCard>
        </div>
    )
}
