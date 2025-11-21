'use client'

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { SpicyCard, SpicyCardHeader, SpicyCardTitle, SpicyCardContent } from "@/components/ui/spicy-card"
import { toast } from "sonner"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default function ProfilePage() {
    const supabase = createClient()
    const router = useRouter()
    const [uploading, setUploading] = useState(false)

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
        <SpicyCard>
            <SpicyCardHeader>
                <SpicyCardTitle>Team Profile</SpicyCardTitle>
            </SpicyCardHeader>
            <SpicyCardContent>
                <div className="flex flex-col items-center gap-4">
                    <label className="cursor-pointer group relative">
                        <Avatar className="w-24 h-24 border-2 border-orange-500/50 group-hover:border-orange-500 transition-all">
                            <AvatarImage src="" />
                            <AvatarFallback>ME</AvatarFallback>
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
    )
}
