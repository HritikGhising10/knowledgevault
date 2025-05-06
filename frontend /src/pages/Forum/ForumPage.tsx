"use client"

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { MessageSquare, ThumbsUp, Loader2, AlertCircle, Plus } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from './apiUtils'; // Import API helper
import { ForumTopicListItemDto, getCategoryLabel } from './forumTypes'; // Import types

function ForumPage() {
    const navigate = useNavigate();
    const [forums, setForums] = useState<ForumTopicListItemDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchForums = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch data from the backend
            const data = await apiRequest<ForumTopicListItemDto[]>('/forums');
            setForums(data);
        } catch (err: any) {
            setError(err.message || "Failed to load forum topics.");
            setForums([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchForums();
    }, [fetchForums]);

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">
                        Discussion
                    </h1>
                    <p className="text-muted-foreground">
                        Discuss and share ideas.
                    </p>
                </div>
                <Button onClick={() => navigate('/forums/create')}>
                    <Plus className="mr-2 h-4 w-4" /> Create New Topic
                </Button>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="text-center p-8">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground mb-4" />
                    <p>Loading topics...</p>
                </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" /> {error}
                </div>
            )}

            {/* Content Area */}
            {!isLoading && !error && (
                <div className="space-y-4">
                    {/* Empty State */}
                    {forums.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                            No forum topics found. Be the first to create one!
                        </p>
                    )}

                    {/* Forum List */}
                    {forums.map((forum) => (
                        <div
                            key={forum.id}
                            onClick={() => navigate(`/forums/${forum.id}`)} // Navigate on click
                            className="block cursor-pointer transition-opacity hover:opacity-90 "
                        >
                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                {/* Use helper for category label */}
                                                <Badge variant="outline">{getCategoryLabel(forum.category)}</Badge>
                                                {forum.isHot && (
                                                    <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">Hot</Badge>
                                                )}
                                            </div>
                                            <CardTitle className="text-xl">{forum.title}</CardTitle>
                                        </div>
                                        {/* Add any actions here if needed */}
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-2">
                                    {/* Display excerpt, fallback to empty string */}
                                    <p className="text-muted-foreground line-clamp-2">{forum.excerpt || ''}</p>
                                </CardContent>
                                <CardFooter className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
                                    {/* Author Info */}
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={forum.author?.avatarUrl || "/placeholder.svg"} alt={forum.author?.name || 'Author'} />
                                            <AvatarFallback>{forum.author?.initials || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <span>{forum.author?.name || forum.author?.username || 'Unknown Author'}</span>
                                        <span>•</span>
                                        {/* Format date nicely */}
                                        <span>{new Date(forum.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {/* Stats */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            <ThumbsUp className="h-4 w-4" />
                                            <span>{forum.upvotes}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MessageSquare className="h-4 w-4" />
                                            {/* Use pre-calculated commentCount from backend */}
                                            <span>{forum.commentCount}</span>
                                        </div>
                                    </div>
                                </CardFooter>
                            </Card>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ForumPage;