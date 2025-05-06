// src/components/forums/forumTypes.ts

// Define string literal type for categories on the frontend
export type ForumCategoryString = "GENERAL" | "TECHNICAL" | "FEATURE" | "BUGS" | "OTHER";

// Map values to display labels for the dropdown/display
export const ForumCategoryLabels: Record<ForumCategoryString, string> = {
    GENERAL: "General Discussion",
    TECHNICAL: "Technical Support",
    FEATURE: "Feature Requests",
    BUGS: "Bug Reports",
    OTHER: "Other"
};

// Helper function to get label from category string
export const getCategoryLabel = (category?: ForumCategoryString | string): string => {
    if (!category) return "Unknown";
    // Check if it's a direct key in our labels map
    if (category in ForumCategoryLabels) {
        return ForumCategoryLabels[category as ForumCategoryString];
    }
    // Fallback for potential mismatch or future values
    return category.toString();
}


// --- Input DTOs (matching backend expectations) ---
export type CreateForumTopicDto = {
    title: string;
    content: string;
    category: ForumCategoryString; // Send the string value
    excerpt?: string;
    isHot?: boolean;
};

export type UpdateForumTopicDto = Partial<Omit<CreateForumTopicDto, 'category'> & { category?: ForumCategoryString }>;

export type CreateForumCommentDto = {
    content: string;
    parentId?: string; // Optional CUID string
};

export type UpdateForumCommentDto = Partial<{
    content: string;
}>;


// --- Response DTOs (mirroring backend response structure) ---
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
    _count?: { // Optional counts from backend
        replies: number;
    }
};

// For the list view
export type ForumTopicListItemDto = {
    id: string;
    title: string;
    excerpt?: string | null;
    category: ForumCategoryString; // Expect string from backend
    views: number;
    upvotes: number;
    isHot: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    author: AuthorInfo | null;
    commentCount: number; // Pre-calculated count from backend
};

// For the detailed view
export type ForumTopicDetailsDto = Omit<ForumTopicListItemDto, 'commentCount'> & {
    content: string; // Full content
    comments: ForumCommentResponseDto[]; // Nested comments/replies array
};