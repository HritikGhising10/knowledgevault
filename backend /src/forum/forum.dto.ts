// src/forum/forum.dto.ts
import { ForumCategory } from '@prisma/client'; // Import the enum generated by Prisma

// --- Input DTOs ---

export type CreateForumTopicDto = {
    title: string;
    content: string;
    category: string; // Expecting string like "technical", "general", etc. from client
    excerpt?: string;
    isHot?: boolean;
};

export type UpdateForumTopicDto = Partial<CreateForumTopicDto>;

export type CreateForumCommentDto = {
    content: string;
    parentId?: string; // Optional: CUID of the parent comment if this is a reply
};

export type UpdateForumCommentDto = Partial<{
    content: string;
}>;

// --- Response DTOs (Example Structure) ---

export type AuthorInfo = {
    id: string;
    username: string | null;
    name: string | null;
    avatarUrl: string | null;
    initials: string | null;
};

export type ForumCommentResponseDto = {
    id: string;
    content: string;
    upvotes: number;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    author: AuthorInfo | null;
    topicId: string;
    parentId: string | null;
    replies?: ForumCommentResponseDto[]; // For nested replies
    _count?: {
        replies: number;
    }
};

export type ForumTopicListItemDto = {
    id: string;
    title: string;
    excerpt?: string | null;
    category: ForumCategory; // Use the actual enum type
    views: number;
    upvotes: number;
    isHot: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    author: AuthorInfo | null;
    commentCount: number; // Calculated count
};

export type ForumTopicDetailsDto = Omit<ForumTopicListItemDto, 'commentCount'> & {
    content: string; // Full content
    comments: ForumCommentResponseDto[]; // Nested comments/replies
};