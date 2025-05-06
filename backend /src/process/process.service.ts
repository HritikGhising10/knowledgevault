import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    InternalServerErrorException,
    BadRequestException,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { Prisma, Process, ProcessStep, User, Program, DataFile } from '@prisma/client';
import {
    CreateProcessDto,
    UpdateProcessDto,
    CreateProcessStepDto,
    UpdateProcessStepDto,
    AddKeyProgramDto,
    AddKeyFileDto,
    ProcessListItemDto,
    ProcessDetailsDto,
} from './process.dto';
import { PrismaService } from 'prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class ProcessService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: LoggerService

    ) { }


    private validateString(value: any, fieldName: string, options: { minLength?: number, maxLength?: number, allowEmpty?: boolean } = {}): string {
        const min = options.minLength ?? 1; const { maxLength, allowEmpty = false } = options;
        if (typeof value !== 'string') throw new BadRequestException(`${fieldName} must be a string.`);
        const trimmedValue = value.trim();
        if (!allowEmpty && trimmedValue.length < min) throw new BadRequestException(`${fieldName} must be non-empty string with at least ${min} chars.`);
        if (allowEmpty && value.length < (options.minLength ?? 0)) throw new BadRequestException(`${fieldName} must be at least ${min} chars.`);
        if (maxLength && value.length > maxLength) throw new BadRequestException(`${fieldName} must be max ${maxLength} chars.`);
        return allowEmpty ? value : trimmedValue;
    }
    private validateOptionalString(value: any, fieldName: string, options: { maxLength?: number } = {}): string | undefined {
        if (value === null || value === undefined) return undefined;
        return this.validateString(value, fieldName, { ...options, minLength: 0, allowEmpty: true });
    }
    private validateBoolean(value: any, fieldName: string): boolean {
        if (typeof value === 'boolean') return value;
        if (String(value).toLowerCase() === 'true') return true;
        if (String(value).toLowerCase() === 'false') return false;
        throw new BadRequestException(`${fieldName} must be a boolean.`);
    }
    private validateNumber(value: any, fieldName: string, options: { min?: number, max?: number, allowNaN?: boolean } = {}): number {
        const num = Number(value);
        if (!options.allowNaN && isNaN(num)) throw new BadRequestException(`${fieldName} must be a valid number.`);
        if (options.min !== undefined && num < options.min) throw new BadRequestException(`${fieldName} must be at least ${options.min}.`);
        if (options.max !== undefined && num > options.max) throw new BadRequestException(`${fieldName} must be no more than ${options.max}.`);
        return num;
    }
    // --- User Lookup ---
    private async findUserByUsernameOrThrow(username: string): Promise<User> {
        if (!username || typeof username !== 'string') throw new UnauthorizedException('Invalid username.');
        const user = await this.prisma.user.findUnique({ where: { username } });
        if (!user) throw new UnauthorizedException(`User '${username}' not found.`);
        return user;
    }
    // --- String Array Helper ---
    private parseCommaSeparated(input: string | undefined | null): string[] {
        if (!input) return [];
        return input.split(',').map(item => item.trim()).filter(Boolean);
    }

    // --- Verify Ownership Helpers ---
    private async verifyProcessOwnership(processId: string, username: string): Promise<Process & { author: User }> {
        const process = await this.prisma.process.findUnique({
            where: { id: processId },
            include: { author: true }
        });
        if (!process) throw new NotFoundException(`Process with ID ${processId} not found.`);
        if (!process.author || process.author.username !== username) {
            throw new ForbiddenException(`You do not have permission to modify process ${processId}.`);
        }
        return process;
    }
    private async verifyStepOwnership(stepId: string, username: string): Promise<ProcessStep & { process: { author: User } }> {
        const step = await this.prisma.processStep.findUnique({
            where: { id: stepId },
            include: { process: { include: { author: true } } } // Include nested author
        });
        if (!step) throw new NotFoundException(`Process Step with ID ${stepId} not found.`);
        if (!step.process || !step.process.author || step.process.author.username !== username) {
            throw new ForbiddenException(`You do not have permission to modify step ${stepId}.`);
        }
        return step;
    }


    // == Process Operations ==

    async createProcess(dto: CreateProcessDto, creatorUsername: string): Promise<Process> { // Return type can be mapped DTO later
        const user = await this.findUserByUsernameOrThrow(creatorUsername);

        const processName = this.validateString(dto.processName, 'processName');
        const processDescription = this.validateOptionalString(dto.processDescription, 'processDescription');
        const programType = this.validateOptionalString(dto.programType, 'programType');
        const keyProgrammers = this.parseCommaSeparated(dto.keyProgrammers);
        const keyUsers = this.parseCommaSeparated(dto.keyUsers);
        const archive = this.validateBoolean(dto.archive ?? false, 'archive');
        this.logger.log(`Creating process for user ${user.username}: ${processName}`, user.id);
        return this.prisma.process.create({
            data: {
                processName, processDescription, programType, keyProgrammers, keyUsers, archive,
                author: { connect: { id: user.id } } // Use relation field
            }
        });
    }

    async findAllProcesses(requestingUsername: string): Promise<ProcessListItemDto[]> {
        const user = await this.findUserByUsernameOrThrow(requestingUsername);
        const processes = await this.prisma.process.findMany({
            where: { userId: user.id }, // Only user's processes
            orderBy: { processName: 'asc' },
            include: {
                author: { select: { id: true, username: true, name: true } },
                _count: { select: { steps: true } }
            }
        });

        // Map to list DTO
        return processes.map(p => ({
            id: p.id,
            processName: p.processName,
            processDescription: p.processDescription,
            programType: p.programType,
            archive: p.archive,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
            author: p.author,
            _count: p._count,
        }));
    }

    async findOneProcess(processId: string, requestingUsername: string): Promise<ProcessDetailsDto> { // Return detailed DTO
        const process = await this.verifyProcessOwnership(processId, requestingUsername); // Verifies ownership

        // Fetch steps with their details
        const steps = await this.prisma.processStep.findMany({
            where: { processId: processId },
            orderBy: { seqID: 'asc' }, // Sort steps by sequence
            include: {
                author: { select: { id: true, username: true, name: true } },
                keyPrograms: {
                    orderBy: { seqID: 'asc' },
                    include: { program: { select: { programName: true } } }
                },
                keyFiles: {
                    orderBy: { seqID: 'asc' },
                    include: { dataFile: { select: { shortName: true, longName: true } } }
                }
            }
        });

        // Map to the detailed response DTO structure
        return {
            id: process.id,
            processName: process.processName,
            processDescription: process.processDescription,
            programType: process.programType,
            keyProgrammers: process.keyProgrammers, // Already arrays
            keyUsers: process.keyUsers,           // Already arrays
            archive: process.archive,
            createdAt: process.createdAt.toISOString(),
            updatedAt: process.updatedAt.toISOString(),
            author: process.author,
            steps: steps.map(step => ({
                id: step.id,
                processId: step.processId,
                seqID: step.seqID,
                processStep: step.processStep,
                processStepDesc: step.processStepDesc,
                processStepNotes: step.processStepNotes,
                archive: step.archive,
                createdAt: step.createdAt.toISOString(),
                updatedAt: step.updatedAt.toISOString(),
                author: step.author,
                keyPrograms: step.keyPrograms.map(kp => ({
                    programId: kp.programId,
                    seqID: kp.seqID,
                    processProgramNotes: kp.processProgramNotes,
                    program: kp.program // Includes name
                })),
                keyFiles: step.keyFiles.map(kf => ({
                    dataFileId: kf.dataFileId,
                    seqID: kf.seqID,
                    processFileNotes: kf.processFileNotes,
                    dataFile: kf.dataFile // Includes names
                }))
            }))
        };
    }

    async updateProcess(processId: string, dto: UpdateProcessDto, requestingUsername: string): Promise<Process> {
        await this.verifyProcessOwnership(processId, requestingUsername); // Verify ownership

        const dataToUpdate: Prisma.ProcessUpdateInput = {};
        if (dto.processName !== undefined) dataToUpdate.processName = this.validateString(dto.processName, 'processName');
        if (dto.processDescription !== undefined) dataToUpdate.processDescription = this.validateOptionalString(dto.processDescription, 'processDescription');
        if (dto.programType !== undefined) dataToUpdate.programType = this.validateOptionalString(dto.programType, 'programType');
        if (dto.keyProgrammers !== undefined) dataToUpdate.keyProgrammers = this.parseCommaSeparated(dto.keyProgrammers);
        if (dto.keyUsers !== undefined) dataToUpdate.keyUsers = this.parseCommaSeparated(dto.keyUsers);
        if (dto.archive !== undefined) dataToUpdate.archive = this.validateBoolean(dto.archive, 'archive');

        if (Object.keys(dataToUpdate).length === 0) throw new BadRequestException('No fields to update.');
        this.logger.log(`Updated process ${processId} for user ${requestingUsername}`, requestingUsername);
        return this.prisma.process.update({ where: { id: processId }, data: dataToUpdate });
    }

    async deleteProcess(processId: string, requestingUsername: string): Promise<{ id: string }> {
        await this.verifyProcessOwnership(processId, requestingUsername); // Verify ownership

        try {
            // Schema `onDelete: Cascade` should handle deleting steps and their key files/programs
            await this.prisma.process.delete({ where: { id: processId } });
            this.logger.log(`Deleted process ${processId} for user ${requestingUsername}`, requestingUsername);
            return { id: processId };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Process with ID ${processId} not found.`);
            }
            console.error(`Error deleting Process ID ${processId}:`, error);
            throw new InternalServerErrorException('Could not delete process.');
        }
    }


    // == ProcessStep Operations ==

    async createStep(processId: string, dto: CreateProcessStepDto, authorUsername: string): Promise<ProcessStep> {
        const user = await this.findUserByUsernameOrThrow(authorUsername);
        // Verify user owns the parent process they're adding a step to
        await this.verifyProcessOwnership(processId, authorUsername);

        const seqID = this.validateString(dto.seqID, 'seqID'); // Treat seqID as string
        const processStep = this.validateString(dto.processStep, 'processStep');
        const processStepDesc = this.validateOptionalString(dto.processStepDesc, 'processStepDesc');
        const processStepNotes = this.validateOptionalString(dto.processStepNotes, 'processStepNotes');
        const archive = this.validateBoolean(dto.archive ?? false, 'archive');

        // Check if seqID is unique for this process
        const existingStep = await this.prisma.processStep.findUnique({
            where: { processId_seqID: { processId, seqID } },
            select: { id: true }
        });
        if (existingStep) {
            throw new ConflictException(`Sequence ID '${seqID}' already exists for process ${processId}.`);
        }

        this.logger.log(`Created step for process ${processId} by user ${authorUsername}`, authorUsername);

        return this.prisma.processStep.create({
            data: {
                seqID, processStep, processStepDesc, processStepNotes, archive,
                process: { connect: { id: processId } },
                author: { connect: { id: user.id } }
            }
        });
    }

    async updateStep(stepId: string, dto: UpdateProcessStepDto, requestingUsername: string): Promise<ProcessStep> {
        const step = await this.verifyStepOwnership(stepId, requestingUsername); // Verifies ownership via process

        const dataToUpdate: Prisma.ProcessStepUpdateInput = {};
        // Cannot update seqID or processId easily
        if (dto.processStep !== undefined) dataToUpdate.processStep = this.validateString(dto.processStep, 'processStep');
        if (dto.processStepDesc !== undefined) dataToUpdate.processStepDesc = this.validateOptionalString(dto.processStepDesc, 'processStepDesc');
        if (dto.processStepNotes !== undefined) dataToUpdate.processStepNotes = this.validateOptionalString(dto.processStepNotes, 'processStepNotes');
        if (dto.archive !== undefined) dataToUpdate.archive = this.validateBoolean(dto.archive, 'archive');

        if (Object.keys(dataToUpdate).length === 0) throw new BadRequestException('No fields to update.');
        this.logger.log(`Updated step ${stepId} for process ${step.processId} by user ${requestingUsername}`, requestingUsername);
        return this.prisma.processStep.update({ where: { id: stepId }, data: dataToUpdate });
    }

    async deleteStep(stepId: string, requestingUsername: string): Promise<{ id: string }> {
        await this.verifyStepOwnership(stepId, requestingUsername); // Verifies ownership

        try {
            // Schema `onDelete: Cascade` should handle deleting key files/programs links
            await this.prisma.processStep.delete({ where: { id: stepId } });
            this.logger.log(`Deleted step ${stepId} for user ${requestingUsername}`, requestingUsername);
            return { id: stepId };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Process Step with ID ${stepId} not found.`);
            }
            console.error(`Error deleting Process Step ID ${stepId}:`, error);
            throw new InternalServerErrorException('Could not delete process step.');
        }
    }

    // == ProcessStep Key Program/File Links ==

    async addKeyProgramToStep(stepId: string, dto: AddKeyProgramDto, requestingUsername: string) {
        const step = await this.verifyStepOwnership(stepId, requestingUsername); // Verify step ownership

        const programId = this.validateString(dto.programId, 'programId');
        const seqID = this.validateNumber(dto.seqID, 'seqID', { min: 1 }); // Sequence should be positive
        const processProgramNotes = this.validateOptionalString(dto.processProgramNotes, 'processProgramNotes');

        // Verify program exists
        const programExists = await this.prisma.program.findUnique({ where: { id: programId }, select: { id: true } });
        if (!programExists) throw new BadRequestException(`Program with ID ${programId} not found.`);

        // Check if this combination already exists
        const existingLink = await this.prisma.processStepKeyProgram.findUnique({
            where: { processStepId_programId_seqID: { processStepId: stepId, programId, seqID } },
            select: { programId: true }
        });
        if (existingLink) {
            throw new ConflictException(`Program ${programId} with sequence ${seqID} is already linked to step ${stepId}.`);
        }

        this.logger.log(`Added key program ${programId} to step ${stepId} for process ${step.processId} by user ${requestingUsername}`, requestingUsername);

        return this.prisma.processStepKeyProgram.create({
            data: {
                processStepId: stepId,
                programId: programId,
                seqID: seqID,
                processProgramNotes: processProgramNotes
            }
        });
    }

    async removeKeyProgramFromStep(stepId: string, programId: string, seqIdNum: number, requestingUsername: string) {
        await this.verifyStepOwnership(stepId, requestingUsername); // Verify step ownership

        try {
            await this.prisma.processStepKeyProgram.delete({
                where: {
                    processStepId_programId_seqID: { // Use composite key name
                        processStepId: stepId,
                        programId: programId,
                        seqID: seqIdNum
                    }
                }
            });
            this.logger.log(`Removed key program ${programId} from step ${stepId} for process ${stepId} by user ${requestingUsername}`, requestingUsername);
            return { success: true };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Key program link not found for Step ${stepId}, Program ${programId}, Seq ${seqIdNum}.`);
            }
            console.error(`Error removing key program link for Step ${stepId}:`, error);
            throw new InternalServerErrorException('Could not remove key program link.');
        }
    }

    async addKeyFileToStep(stepId: string, dto: AddKeyFileDto, requestingUsername: string) {
        const step = await this.verifyStepOwnership(stepId, requestingUsername); // Verify step ownership

        const dataFileId = this.validateString(dto.dataFileId, 'dataFileId');
        const seqID = this.validateNumber(dto.seqID, 'seqID', { min: 1 });
        const processFileNotes = this.validateOptionalString(dto.processFileNotes, 'processFileNotes');

        // Verify file exists
        const dataFileExists = await this.prisma.dataFile.findUnique({ where: { id: dataFileId }, select: { id: true } });
        if (!dataFileExists) throw new BadRequestException(`DataFile with ID ${dataFileId} not found.`);

        // Check if this combination already exists
        const existingLink = await this.prisma.processStepKeyFile.findUnique({
            where: { processStepId_dataFileId_seqID: { processStepId: stepId, dataFileId, seqID } },
            select: { dataFileId: true }
        });
        if (existingLink) {
            throw new ConflictException(`DataFile ${dataFileId} with sequence ${seqID} is already linked to step ${stepId}.`);
        }
        this.logger.log(`Added key file ${dataFileId} to step ${stepId} for process ${step.processId} by user ${requestingUsername}`, requestingUsername);
        return this.prisma.processStepKeyFile.create({
            data: {
                processStepId: stepId,
                dataFileId: dataFileId,
                seqID: seqID,
                processFileNotes: processFileNotes
            }
        });
    }

    async removeKeyFileFromStep(stepId: string, dataFileId: string, seqIdNum: number, requestingUsername: string) {
        await this.verifyStepOwnership(stepId, requestingUsername); // Verify step ownership

        try {
            await this.prisma.processStepKeyFile.delete({
                where: {
                    processStepId_dataFileId_seqID: { // Use composite key name
                        processStepId: stepId,
                        dataFileId: dataFileId,
                        seqID: seqIdNum
                    }
                }
            });
            this.logger.log(`Removed key file ${dataFileId} from step ${stepId} for process ${stepId} by user ${requestingUsername}`, requestingUsername);
            return { success: true };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Key file link not found for Step ${stepId}, File ${dataFileId}, Seq ${seqIdNum}.`);
            }
            console.error(`Error removing key file link for Step ${stepId}:`, error);
            throw new InternalServerErrorException('Could not remove key file link.');
        }
    }

}