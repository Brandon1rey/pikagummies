'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';
import { SpicyCard } from '@/components/ui/spicy-card';

interface ProductStats {
    name: string;
    quantity_sold: number;
    revenue: number;
    [key: string]: any;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];

export default function ProductPerformance() {
    const [data, setData] = useState<ProductStats[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: salesData, error } = await supabase
                .from('sales')
                .select('quantity, total_amount, finished_products(name)');

            if (error) throw error;

            if (salesData) {
                const statsMap: Record<string, ProductStats> = {};

                salesData.forEach((sale: any) => {
                    const productName = sale.finished_products?.name || 'Unknown';
                    if (!statsMap[productName]) {
                        statsMap[productName] = { name: productName, quantity_sold: 0, revenue: 0 };
                    }
                    statsMap[productName].quantity_sold += sale.quantity || 0;
                    statsMap[productName].revenue += sale.total_amount || 0;
                });

                // Convert to array and sort by revenue desc
                const statsArray = Object.values(statsMap).sort((a, b) => b.revenue - a.revenue);
                setData(statsArray);
            }
        } catch (error) {
            console.error('Error fetching product performance:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-stone-500" />
            </div>
        );
    }

    return (
        <>
            {/* Revenue by Product (Bar Chart) */}
            <SpicyCard>
                <div className="mb-4 flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-semibold text-stone-200">Top Earners (Revenue)</h3>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#a8a29e', fontSize: 12 }} />
                            <Tooltip
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                                contentStyle={{ backgroundColor: '#1c1917', borderRadius: '8px', border: '1px solid #333', color: '#fff' }}
                            />
                            <Bar dataKey="revenue" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </SpicyCard>

            {/* Sales Volume Distribution (Pie Chart) */}
            <SpicyCard>
                <div className="mb-4 flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-stone-200">Sales Volume (Units)</h3>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="quantity_sold"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => [value, 'Units Sold']}
                                contentStyle={{ backgroundColor: '#1c1917', borderRadius: '8px', border: '1px solid #333', color: '#fff' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </SpicyCard>
        </>
    );
}
