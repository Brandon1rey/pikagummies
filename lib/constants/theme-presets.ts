// Preset theme configurations for organization customization
// Each theme is designed to be high-contrast, accessible, and professional

export interface ThemePreset {
    id: string
    name: string
    primary: string
    background: string
    foreground: string
    accent?: string
    mode: 'dark' | 'light'
    description: string
}

export const THEME_PRESETS: ThemePreset[] = [
    // Dark Themes
    {
        id: 'midnight',
        name: 'Midnight Blue',
        primary: '#3b82f6',
        background: '#0c0a09',
        foreground: '#fafaf9',
        mode: 'dark',
        description: 'Classic dark theme with blue accents'
    },
    {
        id: 'ocean',
        name: 'Ocean',
        primary: '#0ea5e9',
        background: '#0c1929',
        foreground: '#f0f9ff',
        mode: 'dark',
        description: 'Deep sea blues for focus'
    },
    {
        id: 'forest',
        name: 'Forest',
        primary: '#22c55e',
        background: '#0d1f17',
        foreground: '#ecfdf5',
        mode: 'dark',
        description: 'Natural greens for calm'
    },
    {
        id: 'sunset',
        name: 'Sunset',
        primary: '#f97316',
        background: '#1c1410',
        foreground: '#fff7ed',
        mode: 'dark',
        description: 'Warm oranges for energy'
    },
    {
        id: 'lavender',
        name: 'Lavender',
        primary: '#a855f7',
        background: '#1a0d2e',
        foreground: '#faf5ff',
        mode: 'dark',
        description: 'Purple tones for creativity'
    },
    {
        id: 'crimson',
        name: 'Crimson',
        primary: '#ef4444',
        background: '#1f0d0d',
        foreground: '#fef2f2',
        mode: 'dark',
        description: 'Bold red for action'
    },
    // Light Themes
    {
        id: 'daylight',
        name: 'Daylight',
        primary: '#2563eb',
        background: '#ffffff',
        foreground: '#1e293b',
        mode: 'light',
        description: 'Clean white with blue'
    },
    {
        id: 'mint',
        name: 'Mint Fresh',
        primary: '#10b981',
        background: '#f0fdf4',
        foreground: '#1e3a2f',
        mode: 'light',
        description: 'Light green freshness'
    },
    {
        id: 'coral',
        name: 'Coral',
        primary: '#f43f5e',
        background: '#fff1f2',
        foreground: '#3f1f22',
        mode: 'light',
        description: 'Soft coral warmth'
    },
    {
        id: 'slate',
        name: 'Slate Gray',
        primary: '#6366f1',
        background: '#f8fafc',
        foreground: '#1e293b',
        mode: 'light',
        description: 'Professional slate'
    }
]

export function getPresetById(id: string): ThemePreset | undefined {
    return THEME_PRESETS.find(p => p.id === id)
}

export function getPresetsByMode(mode: 'dark' | 'light'): ThemePreset[] {
    return THEME_PRESETS.filter(p => p.mode === mode)
}
