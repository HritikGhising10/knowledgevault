import {
    Controller, Get, Post, Body, Patch, Param, Delete, Req,
    UseGuards, Query, HttpCode, HttpStatus, ParseIntPipe
} from '@nestjs/common';
import { ProcessService } from './process.service';
import {
    CreateProcessDto, UpdateProcessDto, CreateProcessStepDto, UpdateProcessStepDto,
    AddKeyProgramDto, AddKeyFileDto,
    // Import response DTOs if needed for return type hints
    ProcessListItemDto, ProcessDetailsDto, ProcessStepDetailsDto
} from './process.dto';
import { AuthGuard } from 'src/auth/gaurds/gaurds';

// Define type for authenticated request user
interface AuthenticatedUser { username: string; /* other props */ }
interface AuthenticatedRequest extends Request { user: AuthenticatedUser; }

@Controller("api/processes") // Corrected base route
@UseGuards(AuthGuard)
export class ProcessController {

    constructor(private readonly processService: ProcessService) { }

    // == Process Routes ==
    @Post()
    @HttpCode(HttpStatus.CREATED)
    createProcess(@Body() createDto: CreateProcessDto, @Req() req: AuthenticatedRequest) {
        return this.processService.createProcess(createDto, req.user.username);
    }

    @Get()
    findAllProcesses(@Req() req: AuthenticatedRequest): Promise<ProcessListItemDto[]> {
        return this.processService.findAllProcesses(req.user.username);
    }

    @Get(':processId')
    findOneProcess(@Param('processId') processId: string, @Req() req: AuthenticatedRequest): Promise<ProcessDetailsDto> {
        // Add CUID validation pipe if desired
        return this.processService.findOneProcess(processId, req.user.username);
    }

    @Patch(':processId')
    updateProcess(
        @Param('processId') processId: string,
        @Body() updateDto: UpdateProcessDto,
        @Req() req: AuthenticatedRequest
    ) {
        return this.processService.updateProcess(processId, updateDto, req.user.username);
    }

    @Delete(':processId')
    @HttpCode(HttpStatus.OK) // Or 204
    deleteProcess(@Param('processId') processId: string, @Req() req: AuthenticatedRequest) {
        return this.processService.deleteProcess(processId, req.user.username);
    }

    // == Process Step Routes ==
    @Post(':processId/steps')
    @HttpCode(HttpStatus.CREATED)
    createStep(
        @Param('processId') processId: string,
        @Body() createStepDto: CreateProcessStepDto,
        @Req() req: AuthenticatedRequest
    ) {
        return this.processService.createStep(processId, createStepDto, req.user.username);
    }

    // GET /:processId/steps is handled by findOneProcess including steps

    @Patch('steps/:stepId') // Route doesn't strictly need processId if stepId is unique CUID
    updateStep(
        @Param('stepId') stepId: string,
        @Body() updateStepDto: UpdateProcessStepDto,
        @Req() req: AuthenticatedRequest
        // @Param('processId') processId: string, // Could add for extra validation if needed
    ) {
        return this.processService.updateStep(stepId, updateStepDto, req.user.username);
    }

    @Delete('steps/:stepId') // Route doesn't strictly need processId
    @HttpCode(HttpStatus.OK) // Or 204
    deleteStep(
        @Param('stepId') stepId: string,
        @Req() req: AuthenticatedRequest
        // @Param('processId') processId: string, // Could add for extra validation
    ) {
        return this.processService.deleteStep(stepId, req.user.username);
    }

    // == Key Program/File Link Routes ==

    @Post('steps/:stepId/keyprograms')
    @HttpCode(HttpStatus.CREATED)
    addKeyProgram(
        @Param('stepId') stepId: string,
        @Body() addKeyProgramDto: AddKeyProgramDto,
        @Req() req: AuthenticatedRequest
    ) {
        return this.processService.addKeyProgramToStep(stepId, addKeyProgramDto, req.user.username);
    }

    @Delete('steps/:stepId/keyprograms/:programId/:seqId')
    @HttpCode(HttpStatus.OK) // Or 204
    removeKeyProgram(
        @Param('stepId') stepId: string,
        @Param('programId') programId: string,
        @Param('seqId', ParseIntPipe) seqId: number,
        @Req() req: AuthenticatedRequest
    ) {
        return this.processService.removeKeyProgramFromStep(stepId, programId, seqId, req.user.username);
    }

    @Post('steps/:stepId/keyfiles')
    @HttpCode(HttpStatus.CREATED)
    addKeyFile(
        @Param('stepId') stepId: string,
        @Body() addKeyFileDto: AddKeyFileDto,
        @Req() req: AuthenticatedRequest
    ) {
        return this.processService.addKeyFileToStep(stepId, addKeyFileDto, req.user.username);
    }

    @Delete('steps/:stepId/keyfiles/:dataFileId/:seqId')
    @HttpCode(HttpStatus.OK) // Or 204
    removeKeyFile(
        @Param('stepId') stepId: string,
        @Param('dataFileId') dataFileId: string,
        @Param('seqId', ParseIntPipe) seqId: number,
        @Req() req: AuthenticatedRequest
    ) {
        return this.processService.removeKeyFileFromStep(stepId, dataFileId, seqId, req.user.username);
    }
}