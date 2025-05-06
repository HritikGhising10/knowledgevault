"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./apiUtils"; // Import API helper
import { CreateForumTopicDto, ForumCategoryLabels, ForumCategoryString } from './forumTypes'; // Import types

export default function CreateForumPage() {
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState<ForumCategoryString | "">(""); // Use string type
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); // Clear previous errors

        // Basic Frontend Validation
        if (!title.trim() || !category || !content.trim()) {
            setError("Please fill in all required fields (Title, Category, Content).");
            return;
        }
        // Additional validation if needed (e.g., length)

        setIsSubmitting(true);
        const dto: CreateForumTopicDto = {
            title: title.trim(),
            category: category, // Send the string value
            content: content.trim(),
        };

        try {
            // Call the backend API
            const createdTopic = await apiRequest<{ id: string }>(`/forums`, { // Expecting object with id
                method: 'POST',
                body: JSON.stringify(dto),
            });

            // toast.success("Topic created successfully!"); // Optional feedback
            // Redirect to the newly created topic page
            navigate(`/forums/${createdTopic.id}`);

        } catch (err: any) {
            setError(err.message || "Failed to create topic. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Back Button */}
            <button
                onClick={() => navigate("/forums")}
                className="mb-6 flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to forums
            </button>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Create a New Topic</CardTitle>
                    <CardDescription>Share your question or start a discussion</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        {/* Error Display */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Title Input */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                            <Input
                                id="title"
                                placeholder="What's your question or topic?"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                maxLength={200}
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Category Select */}
                        <div className="space-y-2">
                            <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                            <Select
                                value={category}
                                onValueChange={(value) => setCategory(value as ForumCategoryString)}
                                required
                                disabled={isSubmitting}
                            >
                                <SelectTrigger id="category">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* Map over the ForumCategoryLabels */}
                                    {Object.entries(ForumCategoryLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Content Textarea */}
                        <div className="space-y-2">
                            <Label htmlFor="content">Content <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="content"
                                placeholder="Describe your question or topic in detail..."
                                className="min-h-[200px]"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                                minLength={10} // Example validation
                                disabled={isSubmitting}
                            />
                        </div>
                    </CardContent>

                    {/* Form Actions */}
                    <CardFooter className="flex justify-end space-x-2 mt-5">
                        <Button variant="outline" type="button" onClick={() => navigate("/forums")} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !title || !category || !content}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Topic"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}