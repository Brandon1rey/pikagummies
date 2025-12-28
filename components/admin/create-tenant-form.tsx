"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { createTenantAction } from "@/app/actions/create-tenant-action"

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Organization name must be at least 2 characters.",
    }),
    slug: z.string().min(3, {
        message: "Slug must be at least 3 characters.",
    }).regex(/^[a-z0-9-]+$/, {
        message: "Slug must contain only lowercase letters, numbers, and hyphens.",
    }),
    admin_email: z.string().email({
        message: "Please enter a valid email address.",
    }),
    password: z.string().min(6, {
        message: "Password must be at least 6 characters.",
    }),
    business_type: z.enum(["crafting", "simple_stock", "manufacturing"], {
        required_error: "Please select a business type.",
    }),
    theme_color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, {
        message: "Invalid color hex code.",
    }),
    sales_bot_phone: z.string().optional(), // DEPRECATED - kept for backward compat
    ops_bot_phone: z.string().optional(),    // DEPRECATED - kept for backward compat
    meta_phone_number_id: z.string().optional(), // Meta WhatsApp Cloud API phone_number_id
    admin_personal_phone: z.string().optional(), // Admin's personal phone for Ops Bot
    terminology: z.any().optional(), // Allow passing JSON object
})

export function CreateTenantForm() {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            slug: "",
            admin_email: "",
            password: "",
            business_type: "crafting",
            theme_color: "#f97316", // Default Orange
            sales_bot_phone: "", // DEPRECATED
            ops_bot_phone: "",   // DEPRECATED
            meta_phone_number_id: "",
            admin_personal_phone: "",
            terminology: { kitchen: "Kitchen", pantry: "Pantry", recipes: "Recipes", production: "Production" },
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        startTransition(async () => {
            const result = await createTenantAction(values)

            if (result.success) {
                toast.success("Organization and User created successfully!")
                setOpen(false)
                form.reset()
                router.refresh()
            } else {
                toast.error(result.error || "Failed to create organization")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Tenant
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Organization</DialogTitle>
                    <DialogDescription>
                        Create a new tenant and its admin user.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Organization Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Acme Corp" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Slug (URL Identifier)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="acme-corp" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="admin_email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Admin Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="admin@example.com" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="******" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="business_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Business Type</FormLabel>
                                        <FormControl>
                                            <select
                                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    const type = e.target.value;

                                                    // 1. Auto-set Color
                                                    if (type === "crafting") {
                                                        form.setValue("theme_color", "#f97316"); // Orange
                                                    } else if (type === "manufacturing") {
                                                        form.setValue("theme_color", "#10b981"); // Emerald
                                                    } else {
                                                        form.setValue("theme_color", "#3b82f6"); // Blue
                                                    }

                                                    // 2. Auto-set Terminology (Hidden Logic)
                                                    let terms = {};
                                                    if (type === "crafting") {
                                                        terms = { kitchen: "Kitchen", pantry: "Pantry", recipes: "Recipes", production: "Production" };
                                                    } else if (type === "manufacturing") {
                                                        terms = { kitchen: "Workshop", pantry: "Warehouse", recipes: "Blueprints", production: "Assembly" };
                                                    } else {
                                                        // Simple Stock
                                                        terms = { kitchen: "Kitchen", pantry: "Stockroom", recipes: "Catalog", production: "Production" };
                                                    }
                                                    // We need to pass this to the action, but it's not in the schema yet.
                                                    // Let's add it to the form values manually or update schema.
                                                    form.setValue("terminology", terms);
                                                }}
                                            >
                                                <option value="crafting">Crafting (Gummies/Food)</option>
                                                <option value="manufacturing">Manufacturing (Parts/Assembly)</option>
                                                <option value="simple_stock">Simple Stock (Retail/Resale)</option>
                                            </select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="theme_color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Brand Color</FormLabel>
                                        <div className="flex items-center gap-3">
                                            <FormControl>
                                                <div className="relative w-full">
                                                    <Input type="color" className="h-10 w-20 p-1 cursor-pointer" {...field} />
                                                    <div className="absolute left-24 top-2 text-sm text-muted-foreground uppercase">
                                                        {field.value}
                                                    </div>
                                                </div>
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Meta WhatsApp Phone Number ID */}
                        <FormField
                            control={form.control}
                            name="meta_phone_number_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>📞 Meta Phone Number ID</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123456789012345" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                        From Meta Business Manager (WhatsApp Cloud API).
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Admin Personal Phone for Ops Bot */}
                        <FormField
                            control={form.control}
                            name="admin_personal_phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>👤 Admin Personal Phone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+521XXXXXXXXXX" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                        Admin's WhatsApp for Ops Bot access.
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Creating..." : "Create Tenant"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
