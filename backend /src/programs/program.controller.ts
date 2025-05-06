import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Req,          // To get request object for user info
    UseGuards,    // To protect routes
    ParseIntPipe, // To validate seqID parameters
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ProgramService } from './program.service';
// Import types from the single DTO file
import {
    CreateProgramDto,
    UpdateProgramDto,
    CreateProgramKeyFileDto,
    CreateProgramNoteDto,
    UpdateProgramKeyFileDto,
} from './program.dto';
import { AuthGuard } from 'src/auth/gaurds/gaurds';
import { ProgramKeyFile } from '@prisma/client';
// Import your Auth Guard (replace with your actual guard)

// Define a type for the expected user object shape on the request
interface AuthenticatedUser {
    username: string;
    // Add other properties if available, e.g., id, roles
}
interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}

@Controller('api/programs') // Route prefix
@UseGuards(AuthGuard)     // Apply authentication to all routes
export class ProgramController {
    constructor(private readonly programService: ProgramService) { }

    // == Program Routes ==

    @Post()
    @HttpCode(HttpStatus.CREATED)
    createProgram(@Body() createProgramDto: CreateProgramDto, @Req() req: AuthenticatedRequest) {
        const username = req.user.username; // Get username from authenticated request
        return this.programService.createProgram(createProgramDto, username);
    }

    @Get()
    findAllPrograms(@Req() req: AuthenticatedRequest) {
        const username = req.user.username;
        return this.programService.findAllPrograms(username);
    }

    @Get(':id')
    findOneProgram(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        const username = req.user.username;
        return this.programService.findOneProgram(id, username);
    }

    @Patch(':id')
    updateProgram(
        @Param('id') id: string,
        @Body() updateProgramDto: UpdateProgramDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const username = req.user.username;
        return this.programService.updateProgram(id, updateProgramDto, username);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK) // Or 204 No Content if not returning the ID
    deleteProgram(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        const username = req.user.username;
        return this.programService.deleteProgram(id, username);
    }

    // == ProgramKeyFile Routes ==

    @Post(':programId/keyfiles')
    @HttpCode(HttpStatus.CREATED)
    addKeyFile(
        @Param('programId') programId: string,
        @Body() createKeyFileDto: CreateProgramKeyFileDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const username = req.user.username;
        return this.programService.addKeyFile(programId, createKeyFileDto, username);
    }

    @Delete(':programId/keyfiles/:seqId')
    @HttpCode(HttpStatus.OK) // Or 204 No Content
    deleteKeyFile(
        @Param('programId') programId: string,
        @Param('seqId', ParseIntPipe) seqId: number, // Validate that seqId is a number
        @Req() req: AuthenticatedRequest,
    ) {
        const username = req.user.username;
        return this.programService.deleteKeyFile(programId, seqId, username);
    }

    // == ProgramNotes Routes ==

    @Post(':programId/notes')
    @HttpCode(HttpStatus.CREATED)
    addNote(
        @Param('programId') programId: string,
        @Body() createNoteDto: CreateProgramNoteDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const username = req.user.username; // Note author's username
        return this.programService.addNote(programId, createNoteDto, username);
    }

    @Delete(':programId/notes/:seqId')
    @HttpCode(HttpStatus.OK) // Or 204 No Content
    deleteNote(
        @Param('programId') programId: string,
        @Param('seqId', ParseIntPipe) seqId: number, // Validate that seqId is a number
        @Req() req: AuthenticatedRequest,
    ) {
        const username = req.user.username; // Requester's username
        return this.programService.deleteNote(programId, seqId, username);
    }


    @Patch(':programId/keyfiles/:seqId')
    @HttpCode(HttpStatus.OK)
    updateKeyFileLink(
        @Param('programId') programId: string,
        @Param('seqId', ParseIntPipe) seqId: number, // Validate seqId is integer
        @Body() updateKeyFileDto: UpdateProgramKeyFileDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ProgramKeyFile> { // Adjust return type if using Response DTOs
        return this.programService.updateKeyFileLink(
            programId,
            seqId,
            updateKeyFileDto,
            req.user.username
        );
    }

}