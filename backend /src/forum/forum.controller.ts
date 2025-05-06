import {
    Controller, Get, Post, Body, Patch, Param, Delete, Req,
    UseGuards, Query, HttpCode, HttpStatus, ParseUUIDPipe
} from '@nestjs/common';
import { ForumService } from './forum.service';
import {
    CreateForumTopicDto, UpdateForumTopicDto, CreateForumCommentDto, UpdateForumCommentDto,
    ForumTopicListItemDto, ForumTopicDetailsDto, ForumCommentResponseDto // Import response DTOs
} from './forum.dto';
import { AuthGuard } from 'src/auth/gaurds/gaurds';

interface AuthenticatedUser { username: string; /* other props */ }
interface AuthenticatedRequest extends Request { user: AuthenticatedUser; }

@Controller('api/forums')
@UseGuards(AuthGuard)
export class ForumController {
    constructor(private readonly forumService: ForumService) { }

    // == Topic Routes ==
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createTopic(
        @Body() createTopicDto: CreateForumTopicDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ForumTopicDetailsDto> { // Return detailed DTO
        return this.forumService.createTopic(createTopicDto, req.user.username);
    }

    @Get()
    async findAllTopics(/* Add pagination DTO later @Query() queryParams: any */): Promise<ForumTopicListItemDto[]> {
        return this.forumService.findAllTopics();
    }

    @Get(':topicId')
    async findTopicById(@Param('topicId') topicId: string): Promise<ForumTopicDetailsDto> {
        // Consider adding CUID validation pipe if needed
        return this.forumService.findTopicById(topicId);
    }

    @Patch(':topicId')
    async updateTopic(
        @Param('topicId') topicId: string,
        @Body() updateTopicDto: UpdateForumTopicDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ForumTopicDetailsDto> { // Return updated topic details
        return this.forumService.updateTopic(topicId, updateTopicDto, req.user.username);
    }

    @Delete(':topicId')
    @HttpCode(HttpStatus.OK) // Or 204
    async deleteTopic(
        @Param('topicId') topicId: string,
        @Req() req: AuthenticatedRequest
    ): Promise<{ id: string }> {
        return this.forumService.deleteTopic(topicId, req.user.username);
    }

    // --- NEW: Upvote Routes ---

    @Post('topics/:topicId/upvote') // Use POST for action, could also be PUT
    @HttpCode(HttpStatus.OK)
    async upvoteTopic(
        @Param('topicId') topicId: string,
        @Req() req: AuthenticatedRequest
    ): Promise<{ upvotes: number }> {
        return this.forumService.upvoteTopic(topicId, req.user.username);
    }

    @Post('comments/:commentId/upvote') // Use POST for action
    @HttpCode(HttpStatus.OK)
    async upvoteComment(
        @Param('commentId') commentId: string,
        @Req() req: AuthenticatedRequest
    ): Promise<{ upvotes: number }> {
        return this.forumService.upvoteComment(commentId, req.user.username);
    }


    // == Comment Routes ==
    @Post(':topicId/comments')
    @HttpCode(HttpStatus.CREATED)
    async createComment(
        @Param('topicId') topicId: string,
        @Body() createCommentDto: CreateForumCommentDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ForumCommentResponseDto> { // Return created comment
        return this.forumService.createComment(topicId, createCommentDto, req.user.username);
    }

    // Using specific comment route for update/delete for clarity
    @Patch('comments/:commentId')
    async updateComment(
        @Param('commentId') commentId: string,
        @Body() updateCommentDto: UpdateForumCommentDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ForumCommentResponseDto> { // Return updated comment
        return this.forumService.updateComment(commentId, updateCommentDto, req.user.username);
    }

    @Delete('comments/:commentId')
    @HttpCode(HttpStatus.OK) // Or 204
    async deleteComment(
        @Param('commentId') commentId: string,
        @Req() req: AuthenticatedRequest
    ): Promise<{ id: string }> {
        return this.forumService.deleteComment(commentId, req.user.username);
    }
}