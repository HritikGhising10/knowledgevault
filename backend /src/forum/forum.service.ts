import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    InternalServerErrorException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';

import { Prisma, ForumCategory, ForumTopic, ForumComment, User } from '@prisma/client';
import {
    CreateForumTopicDto,
    UpdateForumTopicDto,
    CreateForumCommentDto,
    UpdateForumCommentDto,
    AuthorInfo, // Import response DTO types if mapping needed
    ForumCommentResponseDto,
    ForumTopicDetailsDto,
    ForumTopicListItemDto
} from './forum.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class ForumService {
    constructor(private readonly prisma: PrismaService) { }

    // --- Validation Helper Functions (Manual) ---
    private validateString(value: any, fieldName: string, options: { minLength?: number, maxLength?: number, allowEmpty?: boolean } = {}): string {
        const min = options.minLength ?? 1;
        const { maxLength, allowEmpty = false } = options;
        if (typeof value !== 'string') throw new BadRequestException(`${fieldName} must be a string.`);
        const trimmedValue = value.trim();
        if (!allowEmpty && trimmedValue.length < min) throw new BadRequestException(`${fieldName} must be a non-empty string with at least ${min} character(s).`);
        if (allowEmpty && value.length < (options.minLength ?? 0)) throw new BadRequestException(`${fieldName} must be at least ${min} character(s).`);
        if (maxLength && value.length > maxLength) throw new BadRequestException(`${fieldName} must be no longer than ${maxLength} characters.`);
        return allowEmpty ? value : trimmedValue;
    }

    private validateOptionalString(value: any, fieldName: string, options: { maxLength?: number } = {}): string | undefined {
        if (value === null || value === undefined || value === '') return undefined; // Treat empty string as undefined for optional
        return this.validateString(value, fieldName, { ...options, minLength: 0, allowEmpty: true });
    }

    private validateBoolean(value: any, fieldName: string): boolean {
        if (typeof value === 'boolean') return value;
        if (String(value).toLowerCase() === 'true') return true;
        if (String(value).toLowerCase() === 'false') return false;
        throw new BadRequestException(`${fieldName} must be a boolean (true or false).`);
    }

    // --- User Lookup ---
    private async findUserByUsernameOrThrow(username: string): Promise<User> {
        if (!username || typeof username !== 'string') {
            throw new UnauthorizedException('Invalid username provided.');
        }
        const user = await this.prisma.user.findUnique({ where: { username } });
        if (!user) throw new UnauthorizedException(`User with username '${username}' not found.`);
        return user;
    }

    // --- Category Mapping ---
    private mapCategoryStringToEnum(categoryString: string | undefined): ForumCategory {
        if (!categoryString) throw new BadRequestException('Category is required.');
        const upperCaseCategory = categoryString.toUpperCase();
        if (upperCaseCategory === 'GENERAL DISCUSSION') return ForumCategory.GENERAL;
        if (upperCaseCategory === 'TECHNICAL SUPPORT') return ForumCategory.TECHNICAL;
        if (upperCaseCategory === 'FEATURE REQUESTS') return ForumCategory.FEATURE;
        if (upperCaseCategory === 'BUG REPORTS') return ForumCategory.BUGS;
        if (upperCaseCategory in ForumCategory) return ForumCategory[upperCaseCategory as keyof typeof ForumCategory];
        throw new BadRequestException(`Invalid category: ${categoryString}. Valid: GENERAL, TECHNICAL, FEATURE, BUGS, OTHER.`);
    }

    // --- Select Clauses ---
    private authorSelect: Prisma.UserSelect = {
        id: true, username: true, name: true, avatarUrl: true, initials: true,
    };

    private mapAuthor(author: User | null): AuthorInfo | null {
        if (!author) return null;
        return {
            id: author.id,
            username: author.username,
            name: author.name,
            avatarUrl: author.avatarUrl,
            initials: author.initials,
        };
    }

    // --- Recursive Comment Mapping for Response ---
    private mapCommentToResponseDto(comment: any): ForumCommentResponseDto { // Use 'any' or define a more specific input type
        return {
            id: comment.id,
            content: comment.content,
            upvotes: comment.upvotes,
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
            author: this.mapAuthor(comment.author),
            topicId: comment.topicId,
            parentId: comment.parentId,
            replies: comment.replies?.map(this.mapCommentToResponseDto.bind(this)) ?? [], // Recursively map replies
            _count: comment._count // Include counts if selected
        };
    }


    // upvote
    async upvoteTopic(topicId: string, requestingUsername: string): Promise<{ upvotes: number }> {
        // Ensure user is valid (optional, but good practice)
        await this.findUserByUsernameOrThrow(requestingUsername);

        try {
            const updatedTopic = await this.prisma.forumTopic.update({
                where: { id: topicId },
                data: {
                    upvotes: {
                        increment: 1 // Atomically increment the count
                    }
                },
                select: { upvotes: true } // Only return the new count
            });
            return updatedTopic;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // Record to update not found
                throw new NotFoundException(`Forum topic with ID ${topicId} not found.`);
            }
            console.error(`Error upvoting topic ${topicId}:`, error);
            throw new InternalServerErrorException('Could not upvote the topic.');
        }
    }

    async upvoteComment(commentId: string, requestingUsername: string): Promise<{ upvotes: number }> {
        // Ensure user is valid
        await this.findUserByUsernameOrThrow(requestingUsername);

        try {
            const updatedComment = await this.prisma.forumComment.update({
                where: { id: commentId },
                data: {
                    upvotes: {
                        increment: 1
                    }
                },
                select: { upvotes: true }
            });
            return updatedComment;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // Record to update not found
                throw new NotFoundException(`Comment with ID ${commentId} not found.`);
            }
            console.error(`Error upvoting comment ${commentId}:`, error);
            throw new InternalServerErrorException('Could not upvote the comment.');
        }
    }


    // == ForumTopic Operations ==

    async createTopic(dto: CreateForumTopicDto, creatorUsername: string): Promise<ForumTopicDetailsDto> {
        const user = await this.findUserByUsernameOrThrow(creatorUsername);
        const title = this.validateString(dto.title, 'title', { maxLength: 200 });
        const content = this.validateString(dto.content, 'content', { minLength: 10 });
        const category = this.mapCategoryStringToEnum(dto.category);
        const excerpt = this.validateOptionalString(dto.excerpt, 'excerpt', { maxLength: 300 }) ?? content.substring(0, 150) + (content.length > 150 ? '...' : '');
        const isHot = this.validateBoolean(dto.isHot ?? false, 'isHot');

        const createdTopic = await this.prisma.forumTopic.create({
            data: { title, content, category, excerpt, isHot, author: { connect: { id: user.id } } },
            include: { author: { select: this.authorSelect } }
        });

        // Map to response DTO
        return {
            ...createdTopic,
            author: this.mapAuthor(createdTopic.author),
            comments: [], // No comments yet on creation
            createdAt: createdTopic.createdAt.toISOString(),
            updatedAt: createdTopic.updatedAt.toISOString(),
        };
    }

    async findAllTopics(/* pagination options */): Promise<ForumTopicListItemDto[]> {
        const topics = await this.prisma.forumTopic.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: this.authorSelect },
                _count: { select: { comments: true } }
            }
        });

        return topics.map(topic => ({
            ...topic,
            author: this.mapAuthor(topic.author),
            commentCount: topic._count.comments,
            createdAt: topic.createdAt.toISOString(),
            updatedAt: topic.updatedAt.toISOString(),
        }));
    }

    async findTopicById(topicId: string): Promise<ForumTopicDetailsDto> {
        const topic = await this.prisma.forumTopic.findUnique({
            where: { id: topicId },
            include: {
                author: { select: this.authorSelect },
                comments: { // Fetch top-level comments first
                    where: { parentId: null },
                    orderBy: { createdAt: 'asc' },
                    include: {
                        author: { select: this.authorSelect },
                        replies: { // Include replies recursively (adjust depth as needed)
                            orderBy: { createdAt: 'asc' },
                            include: {
                                author: { select: this.authorSelect },
                                replies: { // Level 2 replies
                                    orderBy: { createdAt: 'asc' },
                                    include: {
                                        author: { select: this.authorSelect },
                                        _count: { select: { replies: true } } // Count for level 3+
                                    }
                                },
                                _count: { select: { replies: true } } // Count replies to level 1
                            }
                        },
                        _count: { select: { replies: true } } // Count replies to top-level
                    }
                }
            }
        });

        if (!topic) {
            throw new NotFoundException(`Forum topic with ID ${topicId} not found.`);
        }

        // Map the fetched data to the response DTO, handling nested comments/replies
        return {
            ...topic,
            author: this.mapAuthor(topic.author),
            comments: topic.comments.map(this.mapCommentToResponseDto.bind(this)), // Use recursive mapper
            createdAt: topic.createdAt.toISOString(),
            updatedAt: topic.updatedAt.toISOString(),
        };
    }

    async updateTopic(topicId: string, dto: UpdateForumTopicDto, requestingUsername: string): Promise<ForumTopicDetailsDto> {
        const user = await this.findUserByUsernameOrThrow(requestingUsername);
        const topic = await this.prisma.forumTopic.findUnique({ where: { id: topicId }, select: { authorId: true } });
        if (!topic) throw new NotFoundException(`Forum topic with ID ${topicId} not found.`);
        if (topic.authorId !== user.id) throw new ForbiddenException('You can only update your own topics.');

        const dataToUpdate: Prisma.ForumTopicUpdateInput = {};
        if (dto.title !== undefined) dataToUpdate.title = this.validateString(dto.title, 'title');
        if (dto.content !== undefined) dataToUpdate.content = this.validateString(dto.content, 'content');
        if (dto.category !== undefined) dataToUpdate.category = this.mapCategoryStringToEnum(dto.category);
        if (dto.excerpt !== undefined) dataToUpdate.excerpt = this.validateOptionalString(dto.excerpt, 'excerpt');
        if (dto.isHot !== undefined) dataToUpdate.isHot = this.validateBoolean(dto.isHot, 'isHot');

        if (Object.keys(dataToUpdate).length === 0) throw new BadRequestException('No valid fields provided for update.');

        const updatedTopic = await this.prisma.forumTopic.update({
            where: { id: topicId },
            data: dataToUpdate,
            include: { author: { select: this.authorSelect } } // Include author for response
        });

        // Map to response DTO
        return {
            ...updatedTopic,
            author: this.mapAuthor(updatedTopic.author),
            comments: [], // Comments aren't updated here, return empty or re-fetch if needed
            createdAt: updatedTopic.createdAt.toISOString(),
            updatedAt: updatedTopic.updatedAt.toISOString(),
        };
    }

    async deleteTopic(topicId: string, requestingUsername: string): Promise<{ id: string }> {
        const user = await this.findUserByUsernameOrThrow(requestingUsername);
        const topic = await this.prisma.forumTopic.findUnique({ where: { id: topicId }, select: { authorId: true } });
        if (!topic) {
            console.warn(`Attempted to delete non-existent ForumTopic with ID ${topicId}.`);
            return { id: topicId };
        }
        if (topic.authorId !== user.id) throw new ForbiddenException('You can only delete your own topics.');

        try {
            // Relying on schema's onDelete: Cascade for comments now
            await this.prisma.forumTopic.delete({ where: { id: topicId } });
            return { id: topicId };
        } catch (error) {
            console.error(`Error deleting ForumTopic ID ${topicId}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`ForumTopic with ID ${topicId} not found during deletion.`);
            }
            throw new InternalServerErrorException('Could not delete the forum topic.');
        }
    }

    // == ForumComment Operations ==

    async createComment(topicId: string, dto: CreateForumCommentDto, authorUsername: string): Promise<ForumCommentResponseDto> {
        const user = await this.findUserByUsernameOrThrow(authorUsername);
        const content = this.validateString(dto.content, 'content', { minLength: 1 });
        const parentId = dto.parentId ? this.validateString(dto.parentId, 'parentId', { allowEmpty: true }) : undefined;

        const topicExists = await this.prisma.forumTopic.findUnique({ where: { id: topicId }, select: { id: true } });
        if (!topicExists) throw new NotFoundException(`Cannot post comment: Forum topic with ID ${topicId} not found.`);

        if (parentId) {
            const parentComment = await this.prisma.forumComment.findUnique({ where: { id: parentId }, select: { id: true, topicId: true } });
            if (!parentComment) throw new BadRequestException(`Cannot reply: Parent comment with ID ${parentId} not found.`);
            if (parentComment.topicId !== topicId) throw new BadRequestException(`Cannot reply: Parent comment belongs to a different topic.`);
        }

        try {
            const createdComment = await this.prisma.forumComment.create({
                data: {
                    content,
                    author: { connect: { id: user.id } },
                    topic: { connect: { id: topicId } },
                    parent: parentId ? { connect: { id: parentId } } : undefined
                },
                include: { author: { select: this.authorSelect } }
            });
            return this.mapCommentToResponseDto(createdComment); // Map to response DTO

        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException('Failed to create comment: The related topic or parent comment was not found.');
            }
            console.error("Error creating comment:", error);
            throw new InternalServerErrorException('Failed to create the comment.');
        }
    }

    async updateComment(commentId: string, dto: UpdateForumCommentDto, requestingUsername: string): Promise<ForumCommentResponseDto> {
        const user = await this.findUserByUsernameOrThrow(requestingUsername);
        const comment = await this.prisma.forumComment.findUnique({ where: { id: commentId }, select: { authorId: true } });
        if (!comment) throw new NotFoundException(`Comment with ID ${commentId} not found.`);
        if (comment.authorId !== user.id) throw new ForbiddenException('You can only update your own comments.');

        const dataToUpdate: Prisma.ForumCommentUpdateInput = {};
        if (dto.content !== undefined) dataToUpdate.content = this.validateString(dto.content, 'content');

        if (Object.keys(dataToUpdate).length === 0) throw new BadRequestException('No valid fields provided for update.');

        const updatedComment = await this.prisma.forumComment.update({
            where: { id: commentId },
            data: dataToUpdate,
            include: { author: { select: this.authorSelect } } // Include necessary fields for response
        });
        return this.mapCommentToResponseDto(updatedComment);
    }

    async deleteComment(commentId: string, requestingUsername: string): Promise<{ id: string }> {
        const user = await this.findUserByUsernameOrThrow(requestingUsername);
        const comment = await this.prisma.forumComment.findUnique({ where: { id: commentId }, select: { authorId: true } });
        if (!comment) {
            console.warn(`Attempted to delete non-existent ForumComment with ID ${commentId}.`);
            return { id: commentId };
        }
        if (comment.authorId !== user.id) throw new ForbiddenException('You can only delete your own comments.');

        try {
            // Schema's onDelete behaviour for self-relation (parentId) determines reply handling
            await this.prisma.forumComment.delete({ where: { id: commentId } });
            return { id: commentId };
        } catch (error) {
            console.error(`Error deleting ForumComment ID ${commentId}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`ForumComment with ID ${commentId} not found during deletion.`);
            }
            throw new InternalServerErrorException('Could not delete the comment.');
        }
    }
}