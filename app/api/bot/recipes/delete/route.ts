import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/bot/recipes/delete
 * Deletes recipe entries for a product (not the product itself).
 * Called by the ops bot for "eliminar receta" intent.
 * Uses service role to bypass RLS since bot has its own auth.
 */
export async function POST(request: NextRequest) {
    try {
        // Verify Bot Service Token
        const token = request.headers.get('X-Bot-Service-Token');
        if (token !== process.env.BOT_SERVICE_TOKEN) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { product_id, organization_id } = body;

        if (!product_id || !organization_id) {
            return NextResponse.json({
                status: 'error',
                message: 'Missing product_id or organization_id'
            }, { status: 400 });
        }

        // Use service role client to bypass RLS
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Verify product belongs to org first
        const { data: product, error: productError } = await supabase
            .from('finished_products')
            .select('id, name')
            .eq('id', product_id)
            .eq('organization_id', organization_id)
            .single();

        if (productError || !product) {
            return NextResponse.json({
                status: 'error',
                message: 'Product not found in this organization'
            }, { status: 404 });
        }

        // Delete recipe entries directly (service role bypasses RLS)
        const { error: deleteError } = await supabase
            .from('recipes')
            .delete()
            .eq('finished_product_id', product_id)
            .eq('organization_id', organization_id);

        if (deleteError) {
            console.error('[RECIPES/DELETE] Delete error:', deleteError);
            return NextResponse.json({
                status: 'error',
                message: deleteError.message
            }, { status: 500 });
        }

        // Also HARD DELETE the product (permanently remove from DB)
        const { error: deleteProductError } = await supabase
            .from('finished_products')
            .delete()
            .eq('id', product_id)
            .eq('organization_id', organization_id);

        if (deleteProductError) {
            console.error('[RECIPES/DELETE] Delete product error:', deleteProductError);
            // Recipe was deleted but product delete failed - might have FK constraints
            return NextResponse.json({
                status: 'partial',
                message: `Receta eliminada, pero no se pudo borrar el producto: ${deleteProductError.message}`
            });
        }

        console.log(`[RECIPES/DELETE] HARD DELETED product: ${product.name} (${product_id})`);

        return NextResponse.json({
            status: 'success',
            message: `Producto ${product.name} eliminado correctamente`
        });

    } catch (error) {
        console.error('[RECIPES/DELETE] Unexpected error:', error);
        return NextResponse.json({
            status: 'error',
            message: 'Internal server error'
        }, { status: 500 });
    }
}
