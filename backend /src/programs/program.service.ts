import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    InternalServerErrorException,
    BadRequestException,
    UnauthorizedException, // To handle user not found from username
} from '@nestjs/common';

import { Prisma, Program, ProgramKeyFile, ProgramNotes, User } from '@prisma/client';
import {
    CreateProgramDto,
    UpdateProgramDto,
    CreateProgramKeyFileDto,
    CreateProgramNoteDto,
    UpdateProgramKeyFileDto,
} from './program.dto'; // Import types from the DTO file
import { PrismaService } from 'prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class ProgramService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly loggerService: LoggerService

    ) { }

    // --- Validation Helper Functions (Manual) ---
    private validateString(value: any, fieldName: string, options: { minLength?: number, maxLength?: number, allowEmpty?: boolean } = {}): string {
        const min = options.minLength ?? 1;
        const { maxLength, allowEmpty = false } = options;

        if (typeof value !== 'string') {
            throw new BadRequestException(`${fieldName} must be a string.`);
        }
        const trimmedValue = value.trim();
        if (!allowEmpty && trimmedValue.length < min) {
            throw new BadRequestException(`${fieldName} must be a non-empty string with at least ${min} character(s).`);
        }
        if (allowEmpty && value.length < (options.minLength ?? 0)) { // Check original length if empty allowed
            throw new BadRequestException(`${fieldName} must be at least ${min} character(s).`);
        }
        if (maxLength && value.length > maxLength) {
            throw new BadRequestException(`${fieldName} must be no longer than ${maxLength} characters.`);
        }
        return allowEmpty ? value : trimmedValue; // Return original if empty allowed and valid, otherwise trimmed
    }

    private validateOptionalString(value: any, fieldName: string, options: { maxLength?: number } = {}): string | undefined {
        if (value === null || value === undefined) {
            return undefined;
        }
        // Allow empty strings if provided for optional fields, treat as valid ''
        return this.validateString(value, fieldName, { ...options, minLength: 0, allowEmpty: true });
    }

    private validateBoolean(value: any, fieldName: string): boolean {
        if (typeof value === 'boolean') return value;
        if (String(value).toLowerCase() === 'true') return true;
        if (String(value).toLowerCase() === 'false') return false;
        throw new BadRequestException(`${fieldName} must be a boolean (true or false).`);
    }

    // --- User Lookup ---
    /**
     * Finds a user by their username. Throws UnauthorizedException if not found.
     */
    private async findUserIdByUsername(username: string): Promise<string> {
        if (!username || typeof username !== 'string') {
            throw new UnauthorizedException('Invalid username provided.');
        }
        const user = await this.prisma.user.findUnique({
            where: { username },
            select: { id: true },
        });
        if (!user) {
            throw new UnauthorizedException(`User with username '${username}' not found.`);
        }
        return user.id;
    }

    // --- Helper for Comma-Separated String to Array ---
    private parseCommaSeparated(input: string | undefined | null): string[] {
        if (!input) return [];
        return input.split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0); // Remove empty entries after trim
    }

    // == Program Operations ==

    async createProgram(dto: CreateProgramDto, creatorUsername: string): Promise<Program> {
        // 1. Find creator User ID
        const userId = await this.findUserIdByUsername(creatorUsername);

        // 2. Manual Validation & Data Prep
        const programName = this.validateString(dto.programName, 'programName');
        const runningLocation = this.validateOptionalString(dto.runningLocation, 'runningLocation');
        const sourceLocation = this.validateOptionalString(dto.sourceLocation, 'sourceLocation');
        const programType = this.validateOptionalString(dto.programType, 'programType');
        const programDescription = this.validateOptionalString(dto.programDescription, 'programDescription');
        const keyProgrammers = this.parseCommaSeparated(dto.keyProgrammers); // Convert to array
        const keyUsers = this.parseCommaSeparated(dto.keyUsers);             // Convert to array
        const archive = this.validateBoolean(dto.archive ?? false, 'archive');
        this.loggerService.log(`Created program with name: ${programName}, runningLocation: ${runningLocation}, sourceLocation: ${sourceLocation}, programType: ${programType}, programDescription: ${programDescription}, keyProgrammers: ${keyProgrammers}, keyUsers: ${keyUsers}, archive: ${archive}`, creatorUsername);
        return this.prisma.program.create({
            data: {
                programName,
                runningLocation,
                sourceLocation,
                programType,
                programDescription,
                keyProgrammers, // Store as array
                keyUsers,       // Store as array
                archive,
                user: { // Connect to the creator user
                    connect: { id: userId }
                }
            }
        });
    }

    async findAllPrograms(requestingUsername: string): Promise<Program[]> {
        const userId = await this.findUserIdByUsername(requestingUsername);
        return this.prisma.program.findMany({
            // where: { userId }, // Only fetch programs created by this user
            orderBy: { programName: 'asc' },
            include: { // Include counts for the explorer view
                _count: {
                    select: { keyFiles: true, notes: true }
                }
            }
        });
    }

    async findOneProgram(programId: string, requestingUsername: string): Promise<Program & { keyFiles: (ProgramKeyFile & { dataFile: { shortName: string, longName: string } | null })[], notes: (ProgramNotes & { user: { username: string | null, name: string | null } | null })[] }> {
        // 1. Find User ID
        const userId = await this.findUserIdByUsername(requestingUsername);

        // 2. Fetch Program Details
        const program = await this.prisma.program.findUnique({
            where: { id: programId },
            include: {
                user: { select: { id: true } }, // Include owner ID for check
                keyFiles: { // Include related key files
                    orderBy: { seqID: 'asc' },
                    include: { // Include DataFile name for display
                        dataFile: { select: { shortName: true, longName: true } }
                    }
                },
                notes: { // Include related notes
                    orderBy: { seqID: 'asc' },
                    include: { // Include author name/username for display
                        user: { select: { username: true, name: true } }
                    }
                }
            }
        });

        // 3. Check Existence and Ownership
        if (!program) {
            throw new NotFoundException(`Program with ID ${programId} not found.`);
        }
        // Enforce that only the user who created the program definition can view its details
        // Adjust this logic if other users should have access based on different rules
        // if (program.userId !== userId) {
        //     throw new ForbiddenException(`You do not have permission to access this Program.`);
        // }

        // Cast to the expected detailed return type (Prisma doesn't strongly type nested includes this way)
        return program as any;
    }

    async updateProgram(programId: string, dto: UpdateProgramDto, requestingUsername: string): Promise<Program> {
        // 1. Find User ID and Verify Ownership
        const userId = await this.findUserIdByUsername(requestingUsername);
        const existingProgram = await this.prisma.program.findUnique({
            where: { id: programId },
            select: { userId: true } // Only need owner ID for verification
        });

        if (!existingProgram) {
            throw new NotFoundException(`Program with ID ${programId} not found.`);
        }
        if (existingProgram.userId !== userId) {
            throw new ForbiddenException(`You do not have permission to update this Program.`);
        }

        // 2. Manual Validation & Data Prep for Update
        const dataToUpdate: Prisma.ProgramUpdateInput = {};
        if (dto.programName !== undefined) {
            dataToUpdate.programName = this.validateString(dto.programName, 'programName');
        }
        if (dto.runningLocation !== undefined) {
            dataToUpdate.runningLocation = this.validateOptionalString(dto.runningLocation, 'runningLocation');
        }
        if (dto.sourceLocation !== undefined) {
            dataToUpdate.sourceLocation = this.validateOptionalString(dto.sourceLocation, 'sourceLocation');
        }
        if (dto.programType !== undefined) {
            dataToUpdate.programType = this.validateOptionalString(dto.programType, 'programType');
        }
        if (dto.programDescription !== undefined) {
            dataToUpdate.programDescription = this.validateOptionalString(dto.programDescription, 'programDescription');
        }
        if (dto.keyProgrammers !== undefined) {
            dataToUpdate.keyProgrammers = this.parseCommaSeparated(dto.keyProgrammers); // Convert to array
        }
        if (dto.keyUsers !== undefined) {
            dataToUpdate.keyUsers = this.parseCommaSeparated(dto.keyUsers); // Convert to array
        }
        if (dto.archive !== undefined) {
            dataToUpdate.archive = this.validateBoolean(dto.archive, 'archive');
        }

        if (Object.keys(dataToUpdate).length === 0) {
            throw new BadRequestException('No valid fields provided for update.');
        }

        this.loggerService.log(`Updating program with ID: ${programId}, new data: ${JSON.stringify(dataToUpdate)}`, requestingUsername);

        return this.prisma.program.update({
            where: { id: programId },
            data: dataToUpdate
        });
    }

    async deleteProgram(programId: string, requestingUsername: string): Promise<{ id: string }> {
        // 1. Find User ID and Verify Ownership
        const userId = await this.findUserIdByUsername(requestingUsername);
        const programToDelete = await this.prisma.program.findUnique({
            where: { id: programId },
            select: { id: true, userId: true }
        });

        if (!programToDelete) {
            // Allow deletion attempt on non-existent resource to be idempotent
            console.warn(`Attempted to delete non-existent Program with ID ${programId}.`);
            return { id: programId };
        }
        if (programToDelete.userId !== userId) {
            throw new ForbiddenException(`You do not have permission to delete this Program.`);
        }

        // 2. Manual Cascade Delete in Transaction
        try {
            await this.prisma.$transaction(async (tx) => {
                // Delete related notes first
                await tx.programNotes.deleteMany({
                    where: { programId: programId }
                });
                // Delete related key files
                await tx.programKeyFile.deleteMany({
                    where: { programId: programId }
                });
                // Delete the program itself
                await tx.program.delete({
                    where: { id: programId }
                });
            });
            this.loggerService.log(`Successfully deleted Program with ID ${programId}`, requestingUsername);
            return { id: programId };
        } catch (error) {
            console.error(`Error during transaction for deleting Program ID ${programId}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Program with ID ${programId} was not found during deletion transaction.`);
            }
            throw new InternalServerErrorException('Could not complete the deletion of the Program and its related records.');
        }
    }

    // == ProgramKeyFile Operations ==

    async addKeyFile(programId: string, dto: CreateProgramKeyFileDto, requestingUsername: string): Promise<ProgramKeyFile> {
        // 1. Find User ID and Verify Program Ownership
        const userId = await this.findUserIdByUsername(requestingUsername);
        const program = await this.prisma.program.findUnique({
            where: { id: programId },
            select: { userId: true }
        });

        if (!program) {
            throw new NotFoundException(`Program with ID ${programId} not found.`);
        }
        if (program.userId !== userId) {
            throw new ForbiddenException(`You do not have permission to modify key files for this Program.`);
        }

        // 2. Validate Input & Check DataFile Existence
        const dataFileId = this.validateString(dto.dataFileId, 'dataFileId'); // Assuming CUID format
        const programFileNotes = this.validateOptionalString(dto.programFileNotes, 'programFileNotes');
        const archive = this.validateBoolean(dto.archive ?? false, 'archive');

        // Ensure the referenced DataFile actually exists
        const dataFileExists = await this.prisma.dataFile.findUnique({
            where: { id: dataFileId },
            select: { id: true }
        });
        if (!dataFileExists) {
            throw new BadRequestException(`DataFile with ID ${dataFileId} does not exist.`);
        }

        // 3. Calculate next seqID (within a transaction for safety against race conditions)
        const keyFile = await this.prisma.$transaction(async (tx) => {
            const lastKeyFile = await tx.programKeyFile.findFirst({
                where: { programId: programId },
                orderBy: { seqID: 'desc' },
                select: { seqID: true }
            });
            const nextSeqId = lastKeyFile ? lastKeyFile.seqID + 1 : 1;
            this.loggerService.log(`Added Key File to Program ${programId} with SeqID ${nextSeqId}`, requestingUsername);
            // 4. Create ProgramKeyFile
            return tx.programKeyFile.create({
                data: {
                    programId: programId,
                    seqID: nextSeqId,
                    dataFileId: dataFileId,
                    programFileNotes: programFileNotes,
                    archive: archive,
                }
            });
        });
        return keyFile;
    }

    async deleteKeyFile(programId: string, seqIdNum: number, requestingUsername: string): Promise<{ programId: string, seqID: number }> {
        // 1. Find User ID and Verify Program Ownership
        const userId = await this.findUserIdByUsername(requestingUsername);
        const program = await this.prisma.program.findUnique({
            where: { id: programId },
            select: { userId: true }
        });

        if (!program) {
            throw new NotFoundException(`Program with ID ${programId} not found.`);
        }
        if (program.userId !== userId) {
            throw new ForbiddenException(`You do not have permission to modify key files for this Program.`);
        }

        // 2. Delete the specific key file using the composite key
        try {
            await this.prisma.programKeyFile.delete({
                where: {
                    programId_seqID: { // Use the composite key name defined by @@id
                        programId: programId,
                        seqID: seqIdNum
                    }
                }
            });
            this.loggerService.log(`Successfully deleted Key File with SeqID ${seqIdNum} from Program ${programId}`, requestingUsername);
            return { programId, seqID: seqIdNum };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Key File with SeqID ${seqIdNum} for Program ${programId} not found.`);
            }
            console.error(`Error deleting Key File for Program ${programId}, SeqID ${seqIdNum}:`, error);
            throw new InternalServerErrorException('Could not delete the key file.');
        }
    }

    // == ProgramNotes Operations ==

    async addNote(programId: string, dto: CreateProgramNoteDto, authorUsername: string): Promise<ProgramNotes> {
        // 1. Find Author User ID
        const userId = await this.findUserIdByUsername(authorUsername);

        // 2. Verify Program Existence (anyone authenticated can add notes? Or only owner? Assuming anyone for now)
        // If only owner, add ownership check similar to addKeyFile
        const programExists = await this.prisma.program.findUnique({
            where: { id: programId },
            select: { id: true }
        });
        if (!programExists) {
            throw new NotFoundException(`Program with ID ${programId} not found.`);
        }

        // 3. Validate Input
        const programNotes = this.validateString(dto.programNotes, 'programNotes');
        const archive = this.validateBoolean(dto.archive ?? false, 'archive');

        // 4. Calculate next seqID (within a transaction)
        const note = await this.prisma.$transaction(async (tx) => {
            const lastNote = await tx.programNotes.findFirst({
                where: { programId: programId },
                orderBy: { seqID: 'desc' },
                select: { seqID: true }
            });
            const nextSeqId = lastNote ? lastNote.seqID + 1 : 1;

            this.loggerService.log(`Added Note to Program ${programId} with SeqID ${nextSeqId}`, authorUsername);
            return tx.programNotes.create({
                data: {
                    programId: programId,
                    seqID: nextSeqId,
                    programNotes: programNotes,
                    userId: userId, // The user who wrote the note
                    archive: archive,
                }
            });
        });
        return note;
    }

    private validateOptionalBoolean(value: any, fieldName: string): boolean | undefined { // Make sure this exists
        if (value === null || value === undefined) return undefined;
        return this.validateBoolean(value, fieldName);
    }


    async updateKeyFileLink(
        programId: string,
        seqIdNum: number,
        dto: UpdateProgramKeyFileDto,
        requestingUsername: string
    ): Promise<ProgramKeyFile> { // Return the updated link info

        // 1. Verify user owns the parent Program
        await this.verifyProgramOwnership(programId, requestingUsername);

        // 2. Validate incoming DTO data
        const dataToUpdate: Prisma.ProgramKeyFileUpdateInput = {};
        let hasUpdates = false;

        if (dto.programFileNotes !== undefined) {
            // Allow null or empty string to clear notes, validate otherwise
            dataToUpdate.programFileNotes = this.validateOptionalString(dto.programFileNotes, 'programFileNotes');
            hasUpdates = true;
        }
        if (dto.archive !== undefined) {
            dataToUpdate.archive = this.validateOptionalBoolean(dto.archive, 'archive');
            hasUpdates = true;
        }

        if (!hasUpdates) {
            throw new BadRequestException('No fields provided to update for the key file link.');
        }

        // 3. Update the specific key file link using the composite key
        try {
            const updatedLink = await this.prisma.programKeyFile.update({
                where: {
                    programId_seqID: { // Use the composite key name defined by @@id
                        programId: programId,
                        seqID: seqIdNum
                    }
                },
                data: dataToUpdate,
                include: { // Include related data if needed in response
                    dataFile: { select: { shortName: true, longName: true } }
                }
            });
            return updatedLink;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // Record to update not found
                throw new NotFoundException(`Key File link not found for Program ${programId}, SeqID ${seqIdNum}.`);
            }
            console.error(`Error updating Key File link for Program ${programId}, SeqID ${seqIdNum}:`, error);
            throw new InternalServerErrorException('Could not update the key file link.');
        }
    }
    private async verifyProgramOwnership(programId: string, username: string): Promise<Program & { user: User }> {
        const program = await this.prisma.program.findUnique({
            where: { id: programId },
            include: { user: true } // Include the user relation
        });
        if (!program) throw new NotFoundException(`Program with ID ${programId} not found.`);
        // Check username from the included user object
        if (!program.user || program.user.username !== username) {
            throw new ForbiddenException(`You do not have permission to modify program ${programId}.`);
        }
        return program;
    }


    async deleteNote(programId: string, seqIdNum: number, requestingUsername: string): Promise<{ programId: string, seqID: number }> {
        // 1. Find User ID
        const userId = await this.findUserIdByUsername(requestingUsername);

        // 2. Find the Note and check if the requester is the author (or program owner, depending on rules)
        const noteToDelete = await this.prisma.programNotes.findUnique({
            where: {
                programId_seqID: { // Use composite key name
                    programId: programId,
                    seqID: seqIdNum
                }
            },
            select: { userId: true, program: { select: { userId: true } } } // Need note author AND program owner
        });

        if (!noteToDelete) {
            throw new NotFoundException(`Note with SeqID ${seqIdNum} for Program ${programId} not found.`);
        }

        // 3. Authorization Check: Allow deletion if user is the note author OR the program owner
        const isAuthor = noteToDelete.userId === userId;
        const isProgramOwner = noteToDelete.program.userId === userId;
        if (!isAuthor && !isProgramOwner) {
            throw new ForbiddenException(`You do not have permission to delete this Note.`);
        }

        // 4. Delete the note
        try {
            await this.prisma.programNotes.delete({
                where: {
                    programId_seqID: {
                        programId: programId,
                        seqID: seqIdNum
                    }
                }
            });
            this.loggerService.log(`Successfully deleted Note with SeqID ${seqIdNum} from Program ${programId}`, requestingUsername);
            return { programId, seqID: seqIdNum };
        } catch (error) {
            // P2025 might occur if deleted between check and delete command
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Note with SeqID ${seqIdNum} for Program ${programId} not found.`);
            }
            console.error(`Error deleting Note for Program ${programId}, SeqID ${seqIdNum}:`, error);
            throw new InternalServerErrorException('Could not delete the note.');
        }
    }
}