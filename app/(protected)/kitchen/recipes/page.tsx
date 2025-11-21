import { createClient } from "@/lib/supabase/server";
import { RecipeEditor } from "@/components/kitchen/recipe-editor";
import { redirect } from "next/navigation";

export default async function RecipesPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Fetch all finished products
    const { data: products } = await supabase
        .from("finished_products")
        .select("*")
        .order("name");

    // Fetch all raw materials
    const { data: rawMaterials } = await supabase
        .from("raw_materials")
        .select("*")
        .eq("is_active", true)
        .order("name");

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Recipe Lab 🧪</h1>
                <p className="text-muted-foreground">
                    Design your products and define their ingredients.
                </p>
            </div>

            <RecipeEditor
                initialProducts={products || []}
                rawMaterials={rawMaterials || []}
            />
        </div>
    );
}
