// src/components/forums/ForumSinglePage.tsx
// No "use client" needed for standard React

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@radix-ui/react-avatar';
import { ArrowLeft, ThumbsUp, MessageSquare, Share2, Loader2, AlertCircle, Trash } from 'lucide-react';
import React, { useState, useEffect, useCallback, Fragment, JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from './apiUtils'; // Adjust import path if needed
import {
    ForumTopicDetailsDto, CreateForumCommentDto, ForumCommentResponseDto,
    AuthorInfo, getCategoryLabel // Adjust import path if needed
} from './forumTypes';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// ----------- CommentList Component (Defined within ForumSinglePage) -----------

interface CommentListProps {
    comments: ForumCommentResponseDto[];
    topicId: string;
    currentUserInfo: AuthorInfo | null; // Pass current user info (or null if not logged in)
    onReplyPosted: (newReply: ForumCommentResponseDto, parentId: string | null) => void; // Callback
    onDeleteComment: (commentId: string) => void; // Callback for deletion
    onUpvoteComment: (commentId: string) => Promise<void>; // Add handler prop
    isActionLoading: boolean; // General loading state for delete/reply/upvote
    loadingActionId: string | null; // Specific ID being acted upon (upvote/delete)
    onActionError: (error: string | null) => void; // Callback to set error in parent
}

function CommentList({
    comments,
    topicId,
    currentUserInfo,
    onReplyPosted,
    onDeleteComment,
    onUpvoteComment,
    isActionLoading, // Use the general loading state passed from parent
    loadingActionId, // ID for specific comment action loading
    onActionError
}: CommentListProps) {
    const [replyingTo, setReplyingTo] = useState<string | null>(null); // ID of comment being replied to
    const [replyContent, setReplyContent] = useState("");

    const handleStartReply = (commentId: string) => {
        setReplyingTo(replyingTo === commentId ? null : commentId);
        setReplyContent("");
        onActionError(null); // Clear parent error on starting new reply
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
        setReplyContent("");
        onActionError(null);
    };

    // Handles submitting the reply form
    const handleSubmitReply = async (parentId: string) => {
        if (!replyContent.trim()) return;
        onActionError(null); // Clear previous errors

        // Parent component handles setting the loading state via isActionLoading
        const dto: CreateForumCommentDto = {
            content: replyContent.trim(),
            parentId: parentId // Set the parent ID for the reply
        };

        try {
            // Use the existing apiRequest helper, parent handles loading state
            const newReply = await apiRequest<ForumCommentResponseDto>(`/forums/${topicId}/comments`, {
                method: 'POST',
                body: JSON.stringify(dto)
            });
            // toast.success("Reply posted!");
            setReplyContent("");
            setReplyingTo(null);
            onReplyPosted(newReply, parentId); // Notify parent component to refresh or update state

        } catch (err: any) {
            // Set error via callback for parent to display
            onActionError(`Failed to post reply: ${err.message}`);
        }
        // Parent component will set isActionLoading back to false in its own finally block
    };

    // Recursive rendering function for comments and their replies
    const renderComment = (comment: ForumCommentResponseDto, level = 0): JSX.Element => {
        const isReplyingToThis = replyingTo === comment.id;
        const isDeletingThis = loadingActionId === comment.id && isActionLoading; // Check if this specific comment is being deleted/upvoted
        const isUpvotingThis = loadingActionId === comment.id && isActionLoading;

        return (
            // Use Fragment to avoid unnecessary nesting for top-level comments
            <Fragment key={comment.id}>
                {/* Apply indentation and border only for replies (level > 0) */}
                <div className={`${level > 0 ? 'ml-4 pl-4 border-l border-dashed border-border/50' : ''} space-y-3`}>
                    <Card className="bg-card/90 dark:bg-card/80">
                        <CardContent className="pt-4 pb-2">
                            {/* Author Info */}
                            <div className="mb-2 flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={comment.author?.avatarUrl || "/placeholder.svg"} alt={comment.author?.name || 'Author'} />
                                    <AvatarFallback>{comment.author?.initials || 'U'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm">{comment.author?.name || comment.author?.username || 'Unknown User'}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                            {/* Comment Content */}
                            <p className="whitespace-pre-line text-sm leading-relaxed">{comment.content}</p>
                        </CardContent>
                        <CardFooter className="flex justify-between border-t p-2 text-xs">
                            {/* Actions: Upvote & Reply */}
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`flex items-center gap-1 text-muted-foreground h-6 px-1.5 ${isUpvotingThis ? 'opacity-50' : ''}`}
                                    onClick={() => onUpvoteComment(comment.id)}
                                    disabled={isUpvotingThis || isActionLoading || !currentUserInfo} // Disable if any action loading or not logged in
                                    title={currentUserInfo ? "Upvote comment" : "Log in to upvote"}
                                >
                                    {isUpvotingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />}
                                    <span>{comment.upvotes}</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-1 text-muted-foreground h-6 px-1.5"
                                    onClick={() => handleStartReply(comment.id)}
                                    disabled={isActionLoading || !currentUserInfo} // Disable if any action loading or not logged in
                                    title={currentUserInfo ? "Reply to comment" : "Log in to reply"}
                                >
                                    <MessageSquare className="h-3 w-3" />
                                    <span>Reply ({comment._count?.replies ?? 0})</span>
                                </Button>
                            </div>
                            {/* Delete Button (Conditional) */}
                            {currentUserInfo?.id === comment.author?.id && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => onDeleteComment(comment.id)}
                                    disabled={isDeletingThis || isActionLoading} // Disable if deleting this or any other action loading
                                    title="Delete comment"
                                >
                                    {isDeletingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash className="h-3 w-3" />}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>

                    {/* Reply Input Area (Conditional) */}
                    {isReplyingToThis && currentUserInfo && (
                        <div className={`ml-4 pl-4 border-l border-dashed border-border/50`}> {/* Indent reply input */}
                            <div className="flex gap-2 items-start">
                                <Avatar className="h-8 w-8 mt-1">
                                    <AvatarImage src={currentUserInfo.avatarUrl || "/placeholder.svg"} alt={currentUserInfo.name || 'You'} />
                                    <AvatarFallback>{currentUserInfo.initials || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <Textarea
                                        placeholder={`Replying to ${comment.author?.name || 'comment'}...`}
                                        className="mb-2 text-sm"
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        required
                                        minLength={1}
                                        disabled={isActionLoading} // Disable while any action is loading
                                    />
                                    {/* Error display handled by parent component */}
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={handleCancelReply} disabled={isActionLoading}>Cancel</Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleSubmitReply(comment.id)}
                                            disabled={isActionLoading || !replyContent.trim()} // Disable if action loading or no content
                                        >
                                            {isActionLoading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Posting...</> : "Post Reply"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Render Replies Recursively */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="space-y-3"> {/* Let recursive call handle margin/padding */}
                            {comment.replies.map(reply => renderComment(reply, level + 1))}
                        </div>
                    )}
                </div>
            </Fragment>
        );
    }

    // Render the list by mapping top-level comments
    return (
        <div className="space-y-4">
            {comments.map(comment => renderComment(comment))}
        </div>
    );
}


// ----------- ForumSinglePage Component -----------

export default function ForumSinglePage() {
    const { id: topicId } = useParams<{ id: string }>(); // Get ID from route parameters
    const navigate = useNavigate();

    // --- Authentication Placeholder ---
    // Replace this with your actual context or hook to get logged-in user info
    const getCurrentUserInfo = (): AuthorInfo | null => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem("token");
            // In a real app, decode token or retrieve stored user details
            if (token) return { id: "placeholderUserId", username: "CurrentUser", name: "Current User", initials: "CU", avatarUrl: null };
        }
        return null;
    };
    const currentUserInfo = getCurrentUserInfo();
    // ---------------------------------

    const [forum, setForum] = useState<ForumTopicDetailsDto | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Loading state for initial fetch
    const [isActionLoading, setIsActionLoading] = useState(false); // Loading state for actions (comment, reply, delete, upvote)
    const [loadingActionId, setLoadingActionId] = useState<string | null>(null); // Track which specific item action is loading
    const [error, setError] = useState<string | null>(null);
    const [comment, setComment] = useState(""); // State for the top-level comment input

    // Fetch Topic Details Function
    const fetchTopicDetails = useCallback(async (showLoadingIndicator = true) => {
        if (!topicId) { setError("Topic ID missing."); setIsLoading(false); return; }
        if (showLoadingIndicator) setIsLoading(true);
        setError(null); // Clear previous errors on fetch
        try {
            const data = await apiRequest<ForumTopicDetailsDto>(`/forums/${topicId}`);
            setForum(data);
        } catch (err: any) {
            setError(err.message || "Failed to load topic details.");
            setForum(null); // Clear data on error
        } finally {
            if (showLoadingIndicator) setIsLoading(false);
        }
    }, [topicId]); // Depend only on topicId

    // Initial Fetch
    useEffect(() => {
        fetchTopicDetails();
    }, [fetchTopicDetails]); // Run fetchTopicDetails when the component mounts or topicId changes

    // --- Action Handlers ---

    const handleActionError = (errorMessage: string | null) => {
        setError(errorMessage);
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim() || !topicId || !currentUserInfo) { setError("Please write a comment and ensure you are logged in."); return; }
        setIsActionLoading(true); setError(null); setLoadingActionId('new_comment'); // Indicate new comment action
        const dto: CreateForumCommentDto = { content: comment.trim() }; // No parentId for top-level
        try {
            await apiRequest<ForumCommentResponseDto>(`/forums/${topicId}/comments`, { method: 'POST', body: JSON.stringify(dto) });
            setComment(""); // Clear input
            await fetchTopicDetails(false); // Refresh data without main loading indicator
        } catch (err: any) {
            setError(`Failed to post comment: ${err.message}`);
        } finally { setIsActionLoading(false); setLoadingActionId(null); }
    };

    const handleReplyPosted = (newReply: ForumCommentResponseDto, parentId: string | null) => {
        // When a reply is posted via CommentList, just refresh the data
        fetchTopicDetails(false); // Refresh data without main loading indicator
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm("Are you sure you want to delete this comment? This cannot be undone.")) return;
        setIsActionLoading(true); setError(null); setLoadingActionId(commentId);
        try {
            await apiRequest(`/forums/comments/${commentId}`, { method: 'DELETE' });
            await fetchTopicDetails(false); // Refresh data without main loading indicator
        } catch (err: any) {
            setError(`Failed to delete comment: ${err.message}`);
        } finally { setIsActionLoading(false); setLoadingActionId(null); }
    };

    const handleUpvoteTopic = async () => {
        if (!forum || !currentUserInfo || isActionLoading) return;
        setIsActionLoading(true); setError(null); setLoadingActionId(`topic_${forum.id}`);
        try {
            const result = await apiRequest<{ upvotes: number }>(`/forums/topics/${forum.id}/upvote`, { method: 'POST' });
            setForum(prev => prev ? { ...prev, upvotes: result.upvotes } : null); // Update count locally
        } catch (err: any) { setError(`Failed to upvote topic: ${err.message}`); }
        finally { setIsActionLoading(false); setLoadingActionId(null); }
    };

    const handleUpvoteComment = async (commentId: string) => {
        if (!currentUserInfo || isActionLoading) return;
        setIsActionLoading(true); setError(null); setLoadingActionId(commentId);
        try {
            const result = await apiRequest<{ upvotes: number }>(`/forums/comments/${commentId}/upvote`, { method: 'POST' });
            // Update the specific comment in the state locally for immediate feedback
            setForum(prev => {
                if (!prev) return null;
                const updateRecursively = (comments: ForumCommentResponseDto[]): ForumCommentResponseDto[] => comments.map(c => {
                    if (c.id === commentId) return { ...c, upvotes: result.upvotes };
                    if (c.replies?.length) return { ...c, replies: updateRecursively(c.replies) };
                    return c;
                });
                return { ...prev, comments: updateRecursively(prev.comments) };
            });
        } catch (err: any) { setError(`Failed to upvote comment: ${err.message}`); }
        finally { setIsActionLoading(false); setLoadingActionId(null); }
    };

    // --- Render Logic ---
    if (isLoading) { // Show loader only on initial load
        return <div className="container mx-auto px-4 py-8 text-center"><Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground mb-4" /><p>Loading topic...</p></div>;
    }

    // Show error if loading failed and we have no forum data
    if (error && !forum) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                <Button variant="outline" onClick={() => navigate("/forums")}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
            </div>
        );
    }

    // Handle case where fetch succeeded but no topic was found
    if (!forum) {
        return (
            <div className="container mx-auto px-4 py-8 text-center"><p>Topic not found.</p><Button variant="outline" onClick={() => navigate("/forums")} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button></div>
        );
    }

    // --- Main Render ---
    const commentCount = forum.comments?.length ?? 0; // Calculate based on fetched top-level comments
    const isUpvotingThisTopic = loadingActionId === `topic_${forum.id}`;

    return (
        <div className="container mx-auto px-4 py-8">
            <button onClick={() => navigate("/forums")} className="mb-6 flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to discussion
            </button>

            {/* Optional: General action loading indicator */}
            {isActionLoading && loadingActionId !== `topic_${forum.id}` && ( // Don't show if topic upvote handles its own loader
                <div className="fixed top-4 right-4 z-50 p-2 bg-blue-100 text-blue-700 rounded shadow flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Processing...
                </div>
            )}

            {/* Topic Card */}
            <Card className="mb-8">
                <CardHeader className="space-y-4">
                    {/* ... Topic Header Content ... */}
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <Badge variant="outline" className="mb-2">{getCategoryLabel(forum.category)}</Badge>
                            <h1 className="text-2xl font-bold sm:text-3xl">{forum.title}</h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Posted {new Date(forum.createdAt).toLocaleDateString()}</span> • <span>{forum.views} views</span>
                            </div>
                        </div>
                        {/* TODO: Add Edit/Delete buttons for topic owner */}
                    </div>
                    <div className="flex items-center gap-2">
                        <Avatar className="h-10 w-10"><AvatarImage src={forum.author?.avatarUrl || "/placeholder.svg"} /><AvatarFallback>{forum.author?.initials || 'U'}</AvatarFallback></Avatar>
                        <div><p className="font-medium">{forum.author?.name || forum.author?.username || 'Anon'}</p></div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="whitespace-pre-line text-base leading-relaxed">{forum.content}</p>
                </CardContent>
                <CardFooter className="flex justify-between border-t p-4">
                    {/* Topic Actions */}
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost" size="sm"
                            className={`flex items-center gap-1 text-muted-foreground ${isUpvotingThisTopic ? 'opacity-50' : ''}`}
                            onClick={handleUpvoteTopic}
                            disabled={isUpvotingThisTopic || isActionLoading || !currentUserInfo}
                            title={currentUserInfo ? "Upvote topic" : "Log in to upvote"}
                        >
                            {isUpvotingThisTopic ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                            <span>{forum.upvotes}</span>
                        </Button>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" /><span>{commentCount}</span></span>
                    </div>
                    {/* TODO: Share Button Logic */}
                    <Button variant="ghost" size="sm" className="flex items-center gap-1 text-muted-foreground"><Share2 className="h-4 w-4" /><span>Share</span></Button>
                </CardFooter>
            </Card>

            {/* Comment Section */}
            <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">{commentCount} {commentCount === 1 ? "Comment" : "Comments"}</h2>
                {/* Display errors related to comment/reply actions here */}
                {error && isActionLoading && (
                    <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Action Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                )}
                <CommentList
                    comments={forum.comments} // Pass comments from fetched forum data
                    topicId={topicId!}
                    currentUserInfo={currentUserInfo}
                    onReplyPosted={handleReplyPosted}
                    onDeleteComment={handleDeleteComment}
                    onUpvoteComment={handleUpvoteComment}
                    isActionLoading={isActionLoading} // Pass global action loading state
                    loadingActionId={loadingActionId} // Pass specific ID being acted upon
                    onActionError={handleActionError} // Allow list to set errors
                />
            </div>

            {/* Leave a Top-Level Comment Form */}
            {currentUserInfo ? (
                <Card>
                    <CardHeader><h3 className="text-lg font-semibold">Leave a comment</h3></CardHeader>
                    <form onSubmit={handleCommentSubmit}>
                        <CardContent>
                            <div className="flex gap-4 items-start">
                                <Avatar className="h-10 w-10 mt-1"><AvatarImage src={currentUserInfo.avatarUrl || "/placeholder.svg"} /><AvatarFallback>{currentUserInfo.initials || 'U'}</AvatarFallback></Avatar>
                                <Textarea placeholder="Write your comment..." className="flex-1" value={comment} onChange={(e) => setComment(e.target.value)} required minLength={1} disabled={isActionLoading} />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end">
                            <Button type="submit" disabled={isActionLoading || !comment.trim()}>
                                {isActionLoading && loadingActionId === 'new_comment' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</> : "Post Comment"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            ) : (
                <p className="text-center text-muted-foreground">Please <a href="/login" className='underline hover:text-primary'>log in</a> to post comments.</p> // Example login link
            )}
        </div>
    );
}