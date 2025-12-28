'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from '@/components/ui/spicy-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Palette, Upload, Eye, Save, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { THEME_PRESETS, ThemePreset, getPresetById } from '@/lib/constants/theme-presets'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface OrgSettings {
    theme_primary_color: string
    theme_background: string
    theme_foreground: string
    theme_accent: string | null
    theme_mode: string
    theme_preset: string | null
    logo_url: string | null
}

interface SettingsClientProps {
    organizationId: string
    initialSettings: OrgSettings | null
    organizationName: string
}

export function SettingsClient({ organizationId, initialSettings, organizationName }: SettingsClientProps) {
    const supabase = createClient()
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [advancedOpen, setAdvancedOpen] = useState(false)

    const [settings, setSettings] = useState<OrgSettings>({
        theme_primary_color: initialSettings?.theme_primary_color || '#3b82f6',
        theme_background: initialSettings?.theme_background || '#0c0a09',
        theme_foreground: initialSettings?.theme_foreground || '#fafaf9',
        theme_accent: initialSettings?.theme_accent || null,
        theme_mode: initialSettings?.theme_mode || 'dark',
        theme_preset: initialSettings?.theme_preset || 'midnight',
        logo_url: initialSettings?.logo_url || null
    })

    const previewStyles = {
        '--preview-primary': settings.theme_primary_color,
        '--preview-bg': settings.theme_background,
        '--preview-fg': settings.theme_foreground,
    } as React.CSSProperties

    const handlePresetSelect = (preset: ThemePreset) => {
        setSettings(prev => ({
            ...prev,
            theme_preset: preset.id,
            theme_primary_color: preset.primary,
            theme_background: preset.background,
            theme_foreground: preset.foreground,
            theme_mode: preset.mode
        }))
    }

    // Helper to determine best text color (black or white) for a background
    const getContrastColor = (hexColor: string) => {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16)
        const g = parseInt(hexColor.slice(3, 5), 16)
        const b = parseInt(hexColor.slice(5, 7), 16)
        // YIQ equation
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
        return (yiq >= 128) ? '#000000' : '#ffffff'
    }

    const handleColorChange = (key: keyof OrgSettings, value: string) => {
        // Auto-invert text color if background changes
        if (key === 'theme_background') {
            const newForeground = getContrastColor(value)
            setSettings(prev => ({
                ...prev,
                [key]: value,
                theme_foreground: newForeground, // Auto-set text color
                theme_preset: null
            }))
        } else {
            setSettings(prev => ({ ...prev, [key]: value, theme_preset: null }))
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${organizationId}/logo.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('org-logos')
                .upload(fileName, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('org-logos')
                .getPublicUrl(fileName)

            setSettings(prev => ({ ...prev, logo_url: publicUrl }))
            toast.success('Logo uploaded!')
        } catch (error) {
            console.error(error)
            toast.error('Failed to upload logo')
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // Use RPC for safe updates
            const { error } = await supabase.rpc('update_organization_settings', {
                p_organization_id: organizationId,
                p_theme_primary_color: settings.theme_primary_color,
                p_theme_background: settings.theme_background,
                p_theme_foreground: settings.theme_foreground,
                p_theme_accent: settings.theme_accent,
                p_theme_mode: settings.theme_mode,
                p_logo_url: settings.logo_url
            })

            if (error) throw error

            toast.success('Settings saved! Refresh to see changes.')
        } catch (error) {
            console.error(error)
            toast.error('Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    const darkThemes = THEME_PRESETS.filter(t => t.mode === 'dark')
    const lightThemes = THEME_PRESETS.filter(t => t.mode === 'light')

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Settings Panel */}
            <div className="space-y-6">
                {/* Logo Upload */}
                <SpicyCard>
                    <SpicyCardHeader>
                        <SpicyCardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Organization Logo
                        </SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent>
                        <div className="flex items-center gap-4">
                            {settings.logo_url ? (
                                <img
                                    src={settings.logo_url}
                                    alt="Logo"
                                    className="h-16 w-16 rounded-lg object-cover border border-white/10"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-lg bg-stone-800 flex items-center justify-center text-stone-500">
                                    <Upload className="h-6 w-6" />
                                </div>
                            )}
                            <div>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    disabled={uploading}
                                    className="max-w-[200px]"
                                />
                                <p className="text-xs text-muted-foreground mt-1">256x256 PNG recommended</p>
                            </div>
                        </div>
                    </SpicyCardContent>
                </SpicyCard>

                {/* Theme Presets */}
                <SpicyCard>
                    <SpicyCardHeader>
                        <SpicyCardTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5" />
                            Theme Presets
                        </SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent className="space-y-4">
                        {/* Dark Themes */}
                        <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Dark Themes</Label>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {darkThemes.map(theme => (
                                    <button
                                        key={theme.id}
                                        onClick={() => handlePresetSelect(theme)}
                                        className={`relative p-3 rounded-lg border-2 transition-all ${settings.theme_preset === theme.id
                                            ? 'border-primary ring-2 ring-primary/30'
                                            : 'border-white/10 hover:border-white/30'
                                            }`}
                                        style={{ backgroundColor: theme.background }}
                                    >
                                        <div className="flex gap-1 mb-2">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.foreground }} />
                                        </div>
                                        <p className="text-xs font-medium" style={{ color: theme.foreground }}>
                                            {theme.name}
                                        </p>
                                        {settings.theme_preset === theme.id && (
                                            <div className="absolute top-1 right-1">
                                                <Check className="h-4 w-4 text-primary" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Light Themes */}
                        <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Light Themes</Label>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {lightThemes.map(theme => (
                                    <button
                                        key={theme.id}
                                        onClick={() => handlePresetSelect(theme)}
                                        className={`relative p-3 rounded-lg border-2 transition-all ${settings.theme_preset === theme.id
                                            ? 'border-primary ring-2 ring-primary/30'
                                            : 'border-stone-300 hover:border-stone-400'
                                            }`}
                                        style={{ backgroundColor: theme.background }}
                                    >
                                        <div className="flex gap-1 mb-2">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.foreground }} />
                                        </div>
                                        <p className="text-xs font-medium" style={{ color: theme.foreground }}>
                                            {theme.name}
                                        </p>
                                        {settings.theme_preset === theme.id && (
                                            <div className="absolute top-1 right-1">
                                                <Check className="h-4 w-4 text-primary" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Advanced Customization */}
                        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                                    Advanced Customization
                                    {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-4 space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Primary Color</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={settings.theme_primary_color}
                                                onChange={(e) => handleColorChange('theme_primary_color', e.target.value)}
                                                className="h-10 w-14 rounded border border-white/10 cursor-pointer"
                                            />
                                            <Input
                                                value={settings.theme_primary_color}
                                                onChange={(e) => handleColorChange('theme_primary_color', e.target.value)}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Background</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={settings.theme_background}
                                                onChange={(e) => handleColorChange('theme_background', e.target.value)}
                                                className="h-10 w-14 rounded border border-white/10 cursor-pointer"
                                            />
                                            <Input
                                                value={settings.theme_background}
                                                onChange={(e) => handleColorChange('theme_background', e.target.value)}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Text Color</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={settings.theme_foreground}
                                                onChange={(e) => handleColorChange('theme_foreground', e.target.value)}
                                                className="h-10 w-14 rounded border border-white/10 cursor-pointer"
                                            />
                                            <Input
                                                value={settings.theme_foreground}
                                                onChange={(e) => handleColorChange('theme_foreground', e.target.value)}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        {/* Save Button */}
                        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Theme</>}
                        </Button>
                    </SpicyCardContent>
                </SpicyCard>
            </div>

            {/* Preview Panel */}
            <SpicyCard>
                <SpicyCardHeader>
                    <SpicyCardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Live Preview
                    </SpicyCardTitle>
                </SpicyCardHeader>
                <SpicyCardContent>
                    <div className="rounded-lg border border-white/10 overflow-hidden" style={previewStyles}>
                        <div className="p-4 border-b border-white/10" style={{ backgroundColor: 'var(--preview-bg)' }}>
                            <div className="flex items-center gap-3">
                                {settings.logo_url ? (
                                    <img src={settings.logo_url} alt="" className="h-8 w-8 rounded" />
                                ) : (
                                    <div className="h-8 w-8 rounded flex items-center justify-center font-bold text-white" style={{ backgroundColor: 'var(--preview-primary)' }}>
                                        {organizationName[0]}
                                    </div>
                                )}
                                <span className="font-semibold" style={{ color: 'var(--preview-fg)' }}>{organizationName}</span>
                            </div>
                        </div>
                        <div className="p-4 space-y-4" style={{ backgroundColor: 'var(--preview-bg)' }}>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--preview-fg)' }}>Dashboard Preview</h3>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: 'var(--preview-primary)' }}>
                                    Primary
                                </button>
                                <button className="px-4 py-2 rounded-lg border font-medium" style={{ color: 'var(--preview-primary)', borderColor: 'var(--preview-primary)' }}>
                                    Secondary
                                </button>
                            </div>
                            <div className="p-4 rounded-lg border" style={{ backgroundColor: settings.theme_mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: settings.theme_mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                <div className="flex justify-between items-center">
                                    <span style={{ color: 'var(--preview-fg)' }}>Revenue</span>
                                    <span className="text-2xl font-bold" style={{ color: 'var(--preview-primary)' }}>$1,234</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </SpicyCardContent>
            </SpicyCard>
        </div>
    )
}
