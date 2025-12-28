
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Calendar, Package, ShoppingCart, DollarSign, Archive } from "lucide-react"

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Centro de Reportes</h1>
            <p className="text-muted-foreground">Descarga los mismos reportes detallados que genera el Bot, directamente aquí.</p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">

                {/* VENTAS */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-bold">Reportes de Ventas</CardTitle>
                        <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="mt-4 space-y-3">
                        <p className="text-sm text-gray-500 mb-4">Detalle de transacciones, productos vendidos y clientes.</p>
                        <div className="flex flex-col gap-2">
                            <a href="/api/reports/download?type=sales&period=today" target="_blank" className="w-full">
                                <Button variant="outline" className="w-full justify-start">
                                    <Download className="mr-2 h-4 w-4" /> Ventas de Hoy
                                </Button>
                            </a>
                            <a href="/api/reports/download?type=sales&period=week" target="_blank" className="w-full">
                                <Button variant="outline" className="w-full justify-start">
                                    <Calendar className="mr-2 h-4 w-4" /> Ventas Esta Semana
                                </Button>
                            </a>
                            <a href="/api/reports/download?type=sales&period=month" target="_blank" className="w-full">
                                <Button variant="outline" className="w-full justify-start">
                                    <Calendar className="mr-2 h-4 w-4" /> Ventas Este Mes
                                </Button>
                            </a>
                        </div>
                    </CardContent>
                </Card>

                {/* GASTOS */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-bold">Reportes de Gastos</CardTitle>
                        <DollarSign className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="mt-4 space-y-3">
                        <p className="text-sm text-gray-500 mb-4">Listado de egresos categorizados.</p>
                        <div className="flex flex-col gap-2">
                            <a href="/api/reports/download?type=expenses&period=today" target="_blank" className="w-full">
                                <Button variant="outline" className="w-full justify-start">
                                    <Download className="mr-2 h-4 w-4" /> Gastos de Hoy
                                </Button>
                            </a>
                            <a href="/api/reports/download?type=expenses&period=month" target="_blank" className="w-full">
                                <Button variant="outline" className="w-full justify-start">
                                    <Calendar className="mr-2 h-4 w-4" /> Gastos Este Mes
                                </Button>
                            </a>
                        </div>
                    </CardContent>
                </Card>

                {/* INVENTARIO PRODUCTOS */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-bold">Inventario Productos</CardTitle>
                        <Package className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="mt-4 space-y-3">
                        <p className="text-sm text-gray-500 mb-4">Catálogo completo de productos terminados y stock actual.</p>
                        <a href="/api/reports/download?type=products" target="_blank" className="w-full">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                <Download className="mr-2 h-4 w-4" /> Descargar Catálogo Completo
                            </Button>
                        </a>
                    </CardContent>
                </Card>

                {/* INVENTARIO MATERIAS PRIMAS */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-bold">Materias Primas</CardTitle>
                        <Archive className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="mt-4 space-y-3">
                        <p className="text-sm text-gray-500 mb-4">Inventario de insumos, costos promedio y valor total.</p>
                        <a href="/api/reports/download?type=materials" target="_blank" className="w-full">
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                                <Download className="mr-2 h-4 w-4" /> Descargar Inventario Insumos
                            </Button>
                        </a>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
