"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from "@/components/ui/spicy-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, Lightbulb, CheckSquare, Megaphone, MessageSquare, Trash2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import confetti from "canvas-confetti";

type PostType = "idea" | "task" | "shoutout" | "general";

interface TeamPost {
    id: string;
    content: string;
    type: PostType;
    is_resolved: boolean;
    created_at: string;
    author_id: string;
    profiles: {
        full_name: string | null;
        avatar_url: string | null;
        role: string | null;
    } | null;
}

interface TeamBoardProps {
    initialPosts: any[]; // Using any to bypass complex join typing for now, but structure is known
    currentUserId: string;
}

export function TeamBoard({ initialPosts, currentUserId }: TeamBoardProps) {
    const supabase = createClient();
    const router = useRouter();
    const [content, setContent] = useState("");
    const [type, setType] = useState<PostType>("general");
    const [loading, setLoading] = useState(false);

    const handlePost = async () => {
        if (!content.trim()) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from("team_posts")
                .insert({
                    content,
                    type,
                    author_id: currentUserId, // RLS will verify this matches auth.uid()
                    is_resolved: false
                });

            if (error) throw error;

            if (error) throw error;

            confetti();
            toast.success("Posted!");
            setContent("");
            setType("general");
            router.refresh();

        } catch (error: any) {
            console.error(error);
            toast.error("Failed to post", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from("team_posts")
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast.success("Deleted");
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to delete");
        }
    };

    const handleResolve = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from("team_posts")
                .update({ is_resolved: !currentStatus })
                .eq("id", id);

            if (error) throw error;
            toast.success(currentStatus ? "Reopened" : "Resolved");
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to update");
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "idea": return <Lightbulb className="w-4 h-4 text-yellow-400" />;
            case "task": return <CheckSquare className="w-4 h-4 text-blue-400" />;
            case "shoutout": return <Megaphone className="w-4 h-4 text-pink-400" />;
            default: return <MessageSquare className="w-4 h-4 text-gray-400" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "idea": return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
            case "task": return "bg-blue-500/10 border-blue-500/20 text-blue-400";
            case "shoutout": return "bg-pink-500/10 border-pink-500/20 text-pink-400";
            default: return "bg-gray-500/10 border-gray-500/20 text-gray-400";
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Create Post */}
            <div className="lg:col-span-1">
                <SpicyCard className="sticky top-6">
                    <SpicyCardHeader>
                        <SpicyCardTitle>New Post</SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent className="space-y-4">
                        <Textarea
                            placeholder="What's on your mind?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-[100px]"
                        />

                        <div className="flex gap-2">
                            <Select value={type} onValueChange={(val: PostType) => setType(val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="idea">Idea 💡</SelectItem>
                                    <SelectItem value="task">Task 📋</SelectItem>
                                    <SelectItem value="shoutout">Shoutout 📣</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                onClick={handlePost}
                                disabled={loading || !content.trim()}
                                className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white"
                            >
                                {loading ? "Posting..." : <><Send className="w-4 h-4 mr-2" /> Post</>}
                            </Button>
                        </div>
                    </SpicyCardContent>
                </SpicyCard>
            </div>

            {/* Right Column: Feed */}
            <div className="lg:col-span-2 space-y-4">
                {initialPosts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No posts yet. Be the first!
                    </div>
                ) : (
                    initialPosts.map((post) => (
                        <SpicyCard key={post.id} className={`group transition-all hover:border-white/20 ${post.is_resolved ? 'opacity-60 grayscale' : ''}`}>
                            <SpicyCardContent className="p-5">
                                <div className="flex gap-4">
                                    <Avatar>
                                        <AvatarImage src={post.profiles?.avatar_url || ""} />
                                        <AvatarFallback>{post.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-foreground">{post.profiles?.full_name || "Unknown"}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${getTypeColor(post.type)}`}>
                                                        {getIcon(post.type)} {post.type}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                                </span>
                                            </div>

                                            {post.author_id === currentUserId && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {post.type === 'task' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-green-400 hover:bg-green-900/20"
                                                            onClick={() => handleResolve(post.id, post.is_resolved)}
                                                        >
                                                            <CheckCircle2 className={`w-4 h-4 ${post.is_resolved ? 'fill-current' : ''}`} />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-400 hover:bg-red-900/20"
                                                        onClick={() => handleDelete(post.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-foreground/90 whitespace-pre-wrap">{post.content}</p>
                                    </div>
                                </div>
                            </SpicyCardContent>
                        </SpicyCard>
                    ))
                )}
            </div>
        </div>
    );
}
