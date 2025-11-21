import { createClient } from "@/lib/supabase/server";
import { PantryClient } from "@/components/pantry/pantry-client";
import { redirect } from "next/navigation";

export default async function PantryPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Fetch raw materials
    const { data: rawMaterials } = await supabase
        .from("raw_materials")
        .select("*")
        .order("name");

    return <PantryClient initialStock={rawMaterials || []} user={user} />;
}
