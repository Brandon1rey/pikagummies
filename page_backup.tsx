import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame } from "lucide-react";

export default function LoginPage({ searchParams }: { searchParams: { message?: string } }) {
    const login = async (formData: FormData) => {
        "use server";

        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const supabase = await createClient();

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return redirect("/login?message=Could not authenticate user");
        }

        return redirect("/kitchen");
    };

    return (
        <Card className="w-full max-w-md bg-stone-900 border-stone-800 text-stone-100 shadow-2xl shadow-orange-900/20">
            <CardHeader className="text-center space-y-2">
                <div className="mx-auto bg-orange-500/10 p-3 rounded-full w-fit">
                    <Flame className="h-8 w-8 text-orange-500" />
                </div>
                <CardTitle className="text-2xl font-bold text-orange-500">Pikagoma Login</CardTitle>
                <p className="text-stone-400 text-sm">Enter your credentials to access the dashboard</p>
            </CardHeader>
            <CardContent>
                <form action={login} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="chef@pikagoma.com"
                            required
                            className="bg-stone-800 border-stone-700 text-stone-100 focus:border-orange-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="bg-stone-800 border-stone-700 text-stone-100 focus:border-orange-500"
                        />
                    </div>

                    {searchParams?.message && (
                        <div className="p-3 rounded bg-red-900/20 border border-red-900/50 text-red-200 text-sm text-center">
                            {searchParams.message}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold"
                    >
                        Sign In
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
