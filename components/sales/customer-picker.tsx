"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export interface Customer {
    id: string
    name: string
    email?: string
    tax_id?: string
    address?: string
}

interface CustomerPickerProps {
    organizationId: string
    onSelect: (customer: Customer | null) => void
    selectedCustomer: Customer | null
}

export function CustomerPicker({ organizationId, onSelect, selectedCustomer }: CustomerPickerProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [customers, setCustomers] = React.useState<Customer[]>([])
    const [loading, setLoading] = React.useState(false)

    // Create Dialog State
    const [createOpen, setCreateOpen] = React.useState(false)
    const [newCustomer, setNewCustomer] = React.useState({ name: "", email: "", tax_id: "", address: "" })
    const [creating, setCreating] = React.useState(false)

    const supabase = createClient()

    // Fuzzy Search Effect
    React.useEffect(() => {
        const search = async () => {
            if (!query || query.length < 2) {
                setCustomers([])
                return
            }

            setLoading(true)
            const { data, error } = await supabase.rpc('search_customers', {
                p_query: query,
                p_organization_id: organizationId
            })

            if (data) setCustomers(data)
            setLoading(false)
        }

        const debounce = setTimeout(search, 300)
        return () => clearTimeout(debounce)
    }, [query, organizationId, supabase])

    const handleCreate = async () => {
        if (!newCustomer.name) return
        setCreating(true)

        try {
            const { data: customerId, error } = await supabase.rpc('upsert_customer', {
                p_name: newCustomer.name,
                p_email: newCustomer.email || null,
                p_tax_id: newCustomer.tax_id || null,
                p_address: newCustomer.address || null,
                p_organization_id: organizationId
            })

            if (error) throw error

            const created = { id: customerId, ...newCustomer } as Customer
            onSelect(created)
            setCreateOpen(false)
            setOpen(false)
            toast.success("Customer created!")
        } catch (err: any) {
            toast.error("Failed to create customer")
            console.error(err)
        } finally {
            setCreating(false)
        }
    }

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between bg-black/20 border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white h-12"
                    >
                        {selectedCustomer ? (
                            <div className="flex items-center gap-2 text-white">
                                <User className="h-4 w-4" />
                                <span className="font-semibold">{selectedCustomer.name}</span>
                            </div>
                        ) : (
                            "Client (Optional)..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 bg-stone-900 border-white/10">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Search client..."
                            className="text-white"
                            value={query}
                            onValueChange={setQuery}
                        />
                        <CommandList>
                            <CommandEmpty className="py-2 px-2 text-sm text-zinc-500">
                                {loading ? "Searching..." : (
                                    <button
                                        onClick={() => {
                                            setNewCustomer(prev => ({ ...prev, name: query }))
                                            setCreateOpen(true)
                                        }}
                                        className="flex items-center gap-2 w-full p-2 hover:bg-white/10 rounded text-green-400"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create "{query}"
                                    </button>
                                )}
                            </CommandEmpty>
                            <CommandGroup>
                                {customers.map((customer) => (
                                    <CommandItem
                                        key={customer.id}
                                        value={customer.name}
                                        onSelect={() => {
                                            onSelect(customer)
                                            setOpen(false)
                                        }}
                                        className="text-white aria-selected:bg-white/10"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{customer.name}</span>
                                            {customer.tax_id && <span className="text-xs text-zinc-500">{customer.tax_id}</span>}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="bg-stone-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>New Customer</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Name</Label>
                            <Input
                                value={newCustomer.name}
                                onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                className="bg-black/20 border-white/10"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Email</Label>
                            <Input
                                value={newCustomer.email}
                                onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                className="bg-black/20 border-white/10"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Fiscal ID (RFC/VAT)</Label>
                            <Input
                                value={newCustomer.tax_id}
                                onChange={e => setNewCustomer({ ...newCustomer, tax_id: e.target.value })}
                                className="bg-black/20 border-white/10"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Address</Label>
                            <Input
                                value={newCustomer.address}
                                onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                className="bg-black/20 border-white/10"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={creating || !newCustomer.name} className="bg-green-600 hover:bg-green-700">
                            {creating ? "Saving..." : "Create Client"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
