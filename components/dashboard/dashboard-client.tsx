"use client";

import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from "@/components/ui/spicy-card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Activity, Award, Calendar } from "lucide-react";
import { Tables } from "@/lib/database.types";

// Define types for RPC responses since we don't have them explicitly exported yet
type SalesByDow = { day_name: string; total_revenue: number; sale_count: number };
type ExpenseBreakdown = { category: string; total_amount: number };
type SalesByHour = { hour_of_day: number; sale_count: number };
type MonthlySales = { month_name: string; total_revenue: number };
type QuarterlySales = { quarter_name: string; total_revenue: number };
type TopProduct = { product_name: string; total_revenue: number; sale_count: number };

interface DashboardClientProps {
    salesByDow: SalesByDow[];
    expenseBreakdown: ExpenseBreakdown[];
    salesByHour: SalesByHour[];
    financials: Tables<"dashboard_financials">[];
    monthlySales: MonthlySales[];
    quarterlySales: QuarterlySales[];
    topProducts: TopProduct[];
    organizationName: string;
    settings: Record<string, unknown> | null;  // Organization settings object
}

const COLORS = ['#f97316', '#ef4444', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6'];

export function DashboardClient({
    salesByDow,
    expenseBreakdown,
    salesByHour,
    financials,
    monthlySales,
    quarterlySales,
    topProducts,
    organizationName,
    settings
}: DashboardClientProps) {

    // Normalize numeric types from RPC (PostgreSQL numeric → string issue)
    // This ensures chart libraries receive actual numbers, not strings
    const normalizedTopProducts = topProducts.map(p => ({
        ...p,
        total_revenue: Number(p.total_revenue) || 0,
        sale_count: Number(p.sale_count) || 0
    }));

    const normalizedMonthlySales = monthlySales.map(m => ({
        ...m,
        total_revenue: Number(m.total_revenue) || 0
    }));

    const normalizedQuarterlySales = quarterlySales.map(q => ({
        ...q,
        total_revenue: Number(q.total_revenue) || 0
    }));

    const normalizedSalesByDow = salesByDow.map(s => ({
        ...s,
        total_revenue: Number(s.total_revenue) || 0,
        sale_count: Number(s.sale_count) || 0
    }));

    const normalizedExpenseBreakdown = expenseBreakdown.map(e => ({
        ...e,
        total_amount: Number(e.total_amount) || 0
    }));

    // --- KPI Calculations ---
    const revenue = financials
        .filter(f => f.type === 'revenue')
        .reduce((sum, f) => sum + (f.amount || 0), 0);

    const cogs = financials
        .filter(f => f.type === 'cogs')
        .reduce((sum, f) => sum + (f.amount || 0), 0);

    const opex = financials
        .filter(f => f.type === 'opex')
        .reduce((sum, f) => sum + (f.amount || 0), 0);

    const totalCosts = cogs + opex;
    const netProfit = revenue - totalCosts;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Welcome to {organizationName} 🚀</h1>
                <p className="text-muted-foreground">Real-time financial telemetry.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <SpicyCard className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/20">
                    <SpicyCardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-green-400">Total Revenue</p>
                            <DollarSign className="h-4 w-4 text-green-400" />
                        </div>
                        <div className="text-2xl font-bold text-foreground">${revenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </SpicyCardContent>
                </SpicyCard>

                <SpicyCard className="bg-gradient-to-br from-red-900/40 to-orange-900/40 border-red-500/20">
                    <SpicyCardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-red-400">Total Costs</p>
                            <TrendingDown className="h-4 w-4 text-red-400" />
                        </div>
                        <div className="text-2xl font-bold text-foreground">${totalCosts.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">COGS: ${cogs.toLocaleString()} | OpEx: ${opex.toLocaleString()}</p>
                    </SpicyCardContent>
                </SpicyCard>

                <SpicyCard className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-500/20">
                    <SpicyCardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-blue-400">Net Profit</p>
                            <Activity className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="text-2xl font-bold text-foreground">${netProfit.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Cash in hand</p>
                    </SpicyCardContent>
                </SpicyCard>

                <SpicyCard className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/20">
                    <SpicyCardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-purple-400">Profit Margin</p>
                            <TrendingUp className="h-4 w-4 text-purple-400" />
                        </div>
                        <div className="text-2xl font-bold text-foreground">{margin.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Target: 35%</p>
                    </SpicyCardContent>
                </SpicyCard>
            </div>

            {/* Charts Row 1: Trends */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Monthly Trend (Area Chart) */}
                <SpicyCard className="col-span-4">
                    <SpicyCardHeader>
                        <SpicyCardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-orange-500" />
                            Monthly Revenue Trend
                        </SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            {normalizedMonthlySales.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={normalizedMonthlySales}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="month_name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1c1917', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                            itemStyle={{ color: '#f97316' }}
                                        />
                                        <Area type="monotone" dataKey="total_revenue" stroke="#f97316" fillOpacity={1} fill="url(#colorRevenue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    No monthly data available
                                </div>
                            )}
                        </div>
                    </SpicyCardContent>
                </SpicyCard>

                {/* Top Products (Bar Chart) */}
                <SpicyCard className="col-span-3">
                    <SpicyCardHeader>
                        <SpicyCardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-500" />
                            Top Performers
                        </SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent>
                        <div className="h-[300px] w-full">
                            {normalizedTopProducts.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={normalizedTopProducts} margin={{ left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                        <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} hide />
                                        <YAxis dataKey="product_name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#1c1917', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="total_revenue" fill="#eab308" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    No product data available
                                </div>
                            )}
                        </div>
                    </SpicyCardContent>
                </SpicyCard>
            </div>

            {/* Charts Row 2: Details */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Expense Breakdown - BIGGER & BETTER */}
                <SpicyCard className="col-span-2">
                    <SpicyCardHeader>
                        <SpicyCardTitle className="text-xl">Where Does the Money Go?</SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent>
                        <div className="h-[400px] w-full">
                            {normalizedExpenseBreakdown.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={normalizedExpenseBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={120}
                                            paddingAngle={5}
                                            dataKey="total_amount"
                                            style={{ fontSize: '16px', fontWeight: 'bold' }}
                                        >
                                            {normalizedExpenseBreakdown.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1c1917', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '14px' }}
                                            formatter={(value: number) => `$${value.toFixed(2)}`}
                                        />
                                        <Legend
                                            wrapperStyle={{ fontSize: '14px', fontWeight: '500' }}
                                            iconType="circle"
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    No expense data
                                </div>
                            )}
                        </div>
                    </SpicyCardContent>
                </SpicyCard>

                {/* Weekly Sales */}
                <SpicyCard className="col-span-1">
                    <SpicyCardHeader>
                        <SpicyCardTitle>Weekly Sales Pattern</SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent className="pl-2">
                        <div className="h-[400px] w-full">
                            {normalizedSalesByDow.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={normalizedSalesByDow}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                        <XAxis dataKey="day_name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#1c1917', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="total_revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    No sales data
                                </div>
                            )}
                        </div>
                    </SpicyCardContent>
                </SpicyCard>
            </div>
        </div>
    );
}
