'use client'

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Profile } from "@/lib/types"
import { SpicyCard } from "@/components/ui/spicy-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Loader2, Upload, Save, User } from "lucide-react"
import { useRouter } from "next/navigation"

interface ProfileClientProps {
    initialProfile: Profile | null
    user: any
}

export function ProfileClient({ initialProfile, user }: ProfileClientProps) {
    const supabase = createClient()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [fullName, setFullName] = useState(initialProfile?.full_name || "")
    const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url || "")

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        const fileExt = file.name.split('.').pop()
        const filePath = `${user.id}/${Math.random()}.${fileExt}`

        setUploading(true)
        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setAvatarUrl(publicUrl)
            toast.success("Avatar uploaded successfully")
        } catch (error: any) {
            console.error(error)
            toast.error("Failed to upload avatar")
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: fullName,
                    avatar_url: avatarUrl,
                    email: user.email,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error

            toast.success("Profile updated successfully")
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error("Failed to update profile")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
                    <User className="h-8 w-8 text-violet-500" />
                    Your Profile
                </h1>
                <p className="text-zinc-400 mt-1">Manage your identity and settings.</p>
            </div>

            <SpicyCard>
                <div className="space-y-8">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative group">
                            <Avatar className="h-32 w-32 border-4 border-white/10">
                                <AvatarImage src={avatarUrl} />
                                <AvatarFallback className="bg-violet-500/20 text-violet-500 text-4xl">
                                    {fullName?.[0] || user.email?.[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div
                                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                        />
                        <Button
                            variant="outline"
                            className="border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? "Uploading..." : "Change Avatar"}
                        </Button>
                    </div>

                    {/* Form Section */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Email Address</Label>
                            <Input
                                value={user.email}
                                disabled
                                className="bg-black/20 border-white/10 text-zinc-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-300">Full Name</Label>
                            <Input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="bg-black/20 border-white/10 text-white"
                                placeholder="Enter your name"
                            />
                        </div>

                        <Button
                            size="lg"
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold mt-4"
                            onClick={handleSave}
                            disabled={loading || uploading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-5 w-5" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </SpicyCard>
        </div>
    )
}
