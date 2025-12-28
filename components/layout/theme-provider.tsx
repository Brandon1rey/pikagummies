"use client"

import * as React from "react"

interface ThemeProviderProps {
    primaryColor: string // e.g. "#f97316"
    backgroundColor?: string // e.g. "#0c0a09"
    foregroundColor?: string // e.g. "#fafaf9"
    accentColor?: string // optional accent
    children: React.ReactNode
}

export function OrganizationThemeProvider({
    primaryColor,
    backgroundColor,
    foregroundColor,
    accentColor,
    children,
}: ThemeProviderProps) {
    // Convert HEX to HSL (Robust helper)
    // We need this because Shadcn uses HSL values for its --primary variable
    const hexToHSL = (hex: string) => {
        let c = hex.substring(1).split('')
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]]
        }
        const r = parseInt(c[0] + c[1], 16) / 255
        const g = parseInt(c[2] + c[3], 16) / 255
        const b = parseInt(c[4] + c[5], 16) / 255

        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        let h = 0, s = 0, l = (max + min) / 2

        if (max !== min) {
            const d = max - min
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break
                case g: h = (b - r) / d + 2; break
                case b: h = (r - g) / d + 4; break
            }
            h /= 6
        }
        // Return strictly in "Deg % %" format for Tailwind/Shadcn
        return `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`
    }

    const themeVars = React.useMemo(() => {
        const vars: string[] = []

        if (primaryColor) {
            try {
                const hsl = hexToHSL(primaryColor)
                vars.push(`--primary: ${hsl};`)
                vars.push(`--ring: ${hsl};`)
                vars.push(`--color-primary: hsl(${hsl});`)
                vars.push(`--color-ring: hsl(${hsl});`)
            } catch (e) {
                console.warn("Failed to convert primary color:", e)
            }
        }

        if (backgroundColor) {
            try {
                const hsl = hexToHSL(backgroundColor)
                vars.push(`--background: ${hsl};`)
                vars.push(`--color-background: hsl(${hsl});`)
            } catch (e) {
                console.warn("Failed to convert background color:", e)
            }
        }

        if (foregroundColor) {
            try {
                const hsl = hexToHSL(foregroundColor)
                vars.push(`--foreground: ${hsl};`)
                vars.push(`--color-foreground: hsl(${hsl});`)
            } catch (e) {
                console.warn("Failed to convert foreground color:", e)
            }
        }

        if (accentColor) {
            try {
                const hsl = hexToHSL(accentColor)
                vars.push(`--accent: ${hsl};`)
                vars.push(`--color-accent: hsl(${hsl});`)
            } catch (e) {
                console.warn("Failed to convert accent color:", e)
            }
        }

        return vars.join('\n')
    }, [primaryColor, backgroundColor, foregroundColor, accentColor])

    return (
        <>
            {themeVars && (
                <style dangerouslySetInnerHTML={{
                    __html: `:root {\n${themeVars}\n}`
                }} />
            )}
            {children}
        </>
    )
}
