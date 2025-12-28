/**
 * Terminology Constants for Intelligentia NegocIA
 * 
 * This file defines the vocabulary translations for different business types.
 * Used by UI components to display contextually appropriate labels.
 */

export const TERMINOLOGY = {
    food: {
        pantry: 'Pantry',
        kitchen: 'Kitchen',
        recipe: 'Recipe',
        recipes: 'Recipes',
        product: 'Dish',
        production: 'Cooking',
        ingredient: 'Ingredient',
        ingredients: 'Ingredients',
        batch: 'Batch',
        cook: 'Cook'
    },
    stock: {
        pantry: 'Warehouse',
        kitchen: 'Packaging',
        recipe: 'Bundle',
        recipes: 'Bundles',
        product: 'Item',
        production: 'Fulfillment',
        ingredient: 'Component',
        ingredients: 'Components',
        batch: 'Order',
        cook: 'Fulfill'
    },
    manufacturing: {
        pantry: 'Parts Depot',
        kitchen: 'Assembly',
        recipe: 'BOM',
        recipes: 'Bill of Materials',
        product: 'Unit',
        production: 'Manufacturing',
        ingredient: 'Part',
        ingredients: 'Parts',
        batch: 'Production Run',
        cook: 'Assemble'
    }
} as const;

export type BusinessType = keyof typeof TERMINOLOGY;
export type TerminologySet = typeof TERMINOLOGY[BusinessType];
export type TerminologyKey = keyof TerminologySet;

/**
 * Get terminology for a specific business type
 * Falls back to 'food' terminology if type is unknown
 */
export function getTerminology(type: string | null | undefined): TerminologySet {
    if (type && type in TERMINOLOGY) {
        return TERMINOLOGY[type as BusinessType];
    }
    return TERMINOLOGY.food;
}

/**
 * Get a specific term for a business type
 */
export function getTerm(
    type: string | null | undefined,
    key: TerminologyKey
): string {
    const terms = getTerminology(type);
    return terms[key];
}

/**
 * Default terminology (for backward compatibility)
 */
export const DEFAULT_TERMINOLOGY = TERMINOLOGY.food;
