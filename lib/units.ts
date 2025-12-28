/**
 * Unit Conversion System - Sistema de Conversión de Unidades
 * ============================================================
 * Handles unit normalization and conversion for inventory management.
 * Prevents duplicate products by converting compatible units.
 * 
 * FAMILIAS CONVERTIBLES:
 * - peso: ton, kg, g, mg, lb, oz
 * - volumen: m3, lt, ml, gal
 * - longitud: km, m, cm, mm, in, ft, yd
 * 
 * UNIDADES DISCRETAS (no convertibles):
 * - pz, caja, paquete, rollo, bolsa, par, docena
 */

// =============================================================================
// UNIT FAMILIES WITH CONVERSION FACTORS
// =============================================================================

type UnitFamily = 'peso' | 'volumen' | 'longitud' | null

interface UnitInfo {
    factor: number
    synonyms: string[]
}

interface FamilyData {
    base: string
    units: Record<string, UnitInfo>
}

const UNIT_FAMILIES: Record<string, FamilyData> = {
    peso: {
        base: 'kg',
        units: {
            ton: { factor: 1000, synonyms: ['ton', 'tonelada', 'toneladas', 't'] },
            kg: { factor: 1, synonyms: ['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'] },
            g: { factor: 0.001, synonyms: ['g', 'gr', 'gramo', 'gramos'] },
            mg: { factor: 0.000001, synonyms: ['mg', 'miligramo', 'miligramos'] },
            lb: { factor: 0.453592, synonyms: ['lb', 'libra', 'libras'] },
            oz: { factor: 0.0283495, synonyms: ['oz', 'onza', 'onzas'] }
        }
    },
    volumen: {
        base: 'lt',
        units: {
            m3: { factor: 1000, synonyms: ['m3', 'm³', 'metro cubico', 'metros cubicos'] },
            lt: { factor: 1, synonyms: ['lt', 'l', 'lts', 'litro', 'litros'] },
            ml: { factor: 0.001, synonyms: ['ml', 'mls', 'mililitro', 'mililitros'] },
            gal: { factor: 3.78541, synonyms: ['gal', 'galon', 'galones', 'galón'] }
        }
    },
    longitud: {
        base: 'm',
        units: {
            km: { factor: 1000, synonyms: ['km', 'kilometro', 'kilometros', 'kilómetro', 'kilómetros'] },
            m: { factor: 1, synonyms: ['m', 'mts', 'metro', 'metros'] },
            cm: { factor: 0.01, synonyms: ['cm', 'cms', 'centimetro', 'centimetros', 'centímetro'] },
            mm: { factor: 0.001, synonyms: ['mm', 'milimetro', 'milimetros'] },
            in: { factor: 0.0254, synonyms: ['in', 'pulg', 'pulgada', 'pulgadas'] },
            ft: { factor: 0.3048, synonyms: ['ft', 'pie', 'pies', 'foot', 'feet'] },
            yd: { factor: 0.9144, synonyms: ['yd', 'yarda', 'yardas'] }
        }
    }
}

// Discrete units that cannot be converted
const DISCRETE_UNITS: Record<string, string[]> = {
    pz: ['pz', 'pieza', 'piezas', 'unidad', 'unidades', 'un', 'pc', 'pcs', 'u'],
    caja: ['caja', 'cajas', 'box', 'boxes'],
    paquete: ['paquete', 'paquetes', 'pack', 'packs', 'paq', 'bulto', 'bultos'],
    rollo: ['rollo', 'rollos', 'roll', 'rolls'],
    bolsa: ['bolsa', 'bolsas', 'bag', 'bags'],
    par: ['par', 'pares', 'pair', 'pairs'],
    docena: ['docena', 'docenas', 'dozen']
}

// Build synonym cache at module load
const synonymCache: Map<string, { family: UnitFamily; unit: string }> = new Map()

function buildSynonymCache() {
    // Convertible units
    for (const [familyName, familyData] of Object.entries(UNIT_FAMILIES)) {
        for (const [unitStd, unitInfo] of Object.entries(familyData.units)) {
            for (const synonym of unitInfo.synonyms) {
                synonymCache.set(synonym.toLowerCase(), { family: familyName as UnitFamily, unit: unitStd })
            }
        }
    }

    // Discrete units
    for (const [unitStd, synonyms] of Object.entries(DISCRETE_UNITS)) {
        for (const synonym of synonyms) {
            synonymCache.set(synonym.toLowerCase(), { family: null, unit: unitStd })
        }
    }
}

buildSynonymCache()


// =============================================================================
// PUBLIC FUNCTIONS
// =============================================================================

/**
 * Normalize a unit string to its standard form
 * Example: "kilogramos" -> "kg", "litros" -> "lt"
 */
export function normalizeUnit(rawUnit: string): string {
    const lower = rawUnit.toLowerCase().trim()
    const cached = synonymCache.get(lower)
    return cached?.unit || lower
}

/**
 * Get the family of a unit
 * Returns { family, unit } or { family: null, unit } for discrete units
 */
export function getUnitFamily(unit: string): { family: UnitFamily; unit: string } {
    const lower = unit.toLowerCase().trim()
    return synonymCache.get(lower) || { family: null, unit: lower }
}

/**
 * Check if two units are compatible (same family, can convert)
 */
export function unitsAreCompatible(unit1: string, unit2: string): boolean {
    const info1 = getUnitFamily(unit1)
    const info2 = getUnitFamily(unit2)

    return info1.family !== null && info1.family === info2.family
}

/**
 * Convert a quantity from one unit to another
 * Returns null if units are incompatible
 */
export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number | null {
    const from = getUnitFamily(fromUnit)
    const to = getUnitFamily(toUnit)

    // Can't convert between different families or discrete units
    if (from.family === null || to.family === null || from.family !== to.family) {
        return null
    }

    // Same unit, no conversion needed
    if (from.unit === to.unit) {
        return quantity
    }

    // Get conversion factors
    const familyData = UNIT_FAMILIES[from.family]
    const fromFactor = familyData.units[from.unit].factor
    const toFactor = familyData.units[to.unit].factor

    // Convert: from -> base -> to
    return quantity * fromFactor / toFactor
}

/**
 * Get the base unit for a family
 * For discrete units, returns the normalized unit itself
 */
export function getBaseUnit(unit: string): string {
    const info = getUnitFamily(unit)

    if (info.family === null) {
        return info.unit // Discrete unit is its own base
    }

    return UNIT_FAMILIES[info.family].base
}

/**
 * Convert a quantity to the base unit of its family
 * Returns { quantity, unit }
 */
export function convertToBase(quantity: number, unit: string): { quantity: number; unit: string } {
    const info = getUnitFamily(unit)

    if (info.family === null) {
        return { quantity, unit: info.unit } // Discrete unit
    }

    const base = UNIT_FAMILIES[info.family].base
    const converted = convertUnit(quantity, unit, base)

    return { quantity: converted ?? quantity, unit: base }
}

/**
 * Smart stock addition: converts incoming quantity to existing product's unit
 * 
 * Example: Product has 5kg, adding 500g -> converts to 0.5kg, total 5.5kg
 */
export function calculateStockAddition(
    existingStock: number,
    existingUnit: string,
    addQuantity: number,
    addUnit: string
): { newStock: number; unit: string; converted: boolean } {

    const normalizedExisting = normalizeUnit(existingUnit)
    const normalizedAdd = normalizeUnit(addUnit)

    // Same unit, simple addition
    if (normalizedExisting === normalizedAdd) {
        return {
            newStock: existingStock + addQuantity,
            unit: normalizedExisting,
            converted: false
        }
    }

    // Try to convert
    const converted = convertUnit(addQuantity, normalizedAdd, normalizedExisting)

    if (converted !== null) {
        return {
            newStock: existingStock + converted,
            unit: normalizedExisting,
            converted: true
        }
    }

    // Incompatible units - can't convert
    throw new Error(`Cannot convert ${addUnit} to ${existingUnit}. Incompatible unit types.`)
}
