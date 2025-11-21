'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { SpicyCard } from '@/components/ui/spicy-card';

interface RawMaterial {
    id: string;
    name: string;
    current_stock: number;
    unit: string;
    emoji?: string;
}

const LOW_STOCK_THRESHOLD = 10;

export default function InventoryHealth() {
    const [lowStockItems, setLowStockItems] = useState<RawMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('raw_materials')
                .select('*')
                .lt('current_stock', LOW_STOCK_THRESHOLD)
                .order('current_stock', { ascending: true });

            if (error) throw error;
            setLowStockItems(data || []);
        } catch (error) {
            console.error('Error fetching inventory health:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SpicyCard className="h-full">
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-stone-500" />
                </div>
            </SpicyCard>
        );
    }

    return (
        <SpicyCard className="h-full border-red-500/10">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <AlertTriangle className={`h-5 w-5 ${lowStockItems.length > 0 ? 'text-red-500' : 'text-stone-500'}`} />
                    <h3 className="text-lg font-semibold text-stone-200">Inventory Health</h3>
                </div>
                {lowStockItems.length === 0 && (
                    <span className="inline-flex items-center rounded-full bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-400 border border-green-900/50">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        All Good
                    </span>
                )}
            </div>

            <div className="space-y-3">
                {lowStockItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-stone-500">
                        <Package className="mb-2 h-8 w-8 opacity-20" />
                        <p>Pantry is well stocked.</p>
                    </div>
                ) : (
                    lowStockItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg border border-red-900/30 bg-red-950/10 p-3">
                            <div className="flex items-center space-x-3">
                                <span className="text-xl">{item.emoji || '📦'}</span>
                                <div>
                                    <p className="font-medium text-stone-200">{item.name}</p>
                                    <p className="text-xs text-red-400">Low Stock Alert</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-red-500">{item.current_stock} {item.unit}</p>
                                <p className="text-xs text-stone-500">Threshold: {LOW_STOCK_THRESHOLD}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </SpicyCard>
    );
}
