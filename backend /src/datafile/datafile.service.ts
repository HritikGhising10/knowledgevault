// src/datafile/datafile.service.ts
import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    InternalServerErrorException,
    BadRequestException,
} from "@nestjs/common";
import { CreateDataFileDto } from './dto/create-datafile.dto';
import { UpdateDataFileDto } from './dto/update-datafile.dto';
import { CreateDataFieldDto } from './dto/create-datafield.dto';
import { UpdateDataFieldDto } from './dto/update-datafield.dto';
import { CreateValidDataDto } from './dto/create-validdata.dto';
import { UpdateValidDataDto } from './dto/update-validdata.dto';
import { Prisma, DataField, DataFile, ValidData } from '@prisma/client';
import { PrismaService } from "prisma/prisma.service";
import { LoggerService } from "src/logger/logger.service";


export enum FieldType {
    CHARACTER,
    NUMERIC,
    DATE,
    DATETIME,
    BOOLEAN,
    PACKED_DECIMAL,
    FLOAT,
    DOUBLE,
    INTEGER,
    LONG,
    SHORT,
    BYTE,
    STRING,
    TEXT,
    BLOB,
    CLOB,
    OTHER
}
@Injectable()
export class DatafileService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly loggerService: LoggerService

    ) { }

    // --- Validation Helper Functions (Keep these as they are) ---
    private validateString(value: any, fieldName: string, minLength = 1, maxLength?: number): string {
        if (typeof value !== 'string' || value.trim().length < minLength) {
            throw new BadRequestException(`${fieldName} must be a string with at least ${minLength} character(s).`);
        }
        if (maxLength && value.length > maxLength) {
            throw new BadRequestException(`${fieldName} must be no longer than ${maxLength} characters.`);
        }
        return value.trim();
    }

    private validateOptionalString(value: any, fieldName: string, maxLength?: number): string | undefined {
        if (value === null || value === undefined || value === '') {
            return undefined;
        }
        if (typeof value !== 'string') {
            throw new BadRequestException(`${fieldName} must be a string if provided.`);
        }
        if (maxLength && value.length > maxLength) {
            throw new BadRequestException(`${fieldName} must be no longer than ${maxLength} characters.`);
        }
        return value.trim();
    }

    private validateNumber(value: any, fieldName: string, min?: number, max?: number): number {
        const num = Number(value);
        if (typeof num !== 'number' || isNaN(num)) {
            throw new BadRequestException(`${fieldName} must be a valid number.`);
        }
        if (min !== undefined && num < min) {
            throw new BadRequestException(`${fieldName} must be at least ${min}.`);
        }
        if (max !== undefined && num > max) {
            throw new BadRequestException(`${fieldName} must be no more than ${max}.`);
        }
        return num;
    }

    private validateBoolean(value: any, fieldName: string): boolean {
        if (typeof value !== 'boolean') {
            if (String(value).toLowerCase() === 'true') return true;
            if (String(value).toLowerCase() === 'false') return false;
            throw new BadRequestException(`${fieldName} must be a boolean (true or false).`);
        }
        return value;
    }
    private validateOptionalBoolean(value: any, fieldName: string): boolean | undefined {
        if (value === null || value === undefined) {
            return undefined;
        }
        return this.validateBoolean(value, fieldName);
    }

    private validateFieldType(value: any, fieldName: string): FieldType {
        if (typeof value !== 'string' || !value) {
            throw new BadRequestException(`${fieldName} must be a non-empty string.`);
        }
        const upperCaseValue = value.toUpperCase();
        // Check if the uppercase string is a valid key in the Prisma Enum
        if (upperCaseValue in FieldType) {
            return FieldType[upperCaseValue as keyof typeof FieldType];
        } else {
            throw new BadRequestException(`Invalid ${fieldName}: '${value}'. Must be one of [${Object.keys(FieldType).join(', ')}]`);
        }
    }


    // == DataFile Operations ==

    async createDataFile(createDataFileDto: CreateDataFileDto, userId: string): Promise<DataFile> {
        // --- Validation ---
        const shortName = this.validateString(createDataFileDto.shortName, 'shortName');
        const longName = this.validateString(createDataFileDto.longName, 'longName');
        const fileSize = this.validateNumber(createDataFileDto.fileSize, 'fileSize', 0);
        // These return string | undefined
        const fileLocation = this.validateString(createDataFileDto.fileLocation, 'fileLocation');
        // const docLink = this.validateString(createDataFileDto.docLink, 'docLink');
        const archive = this.validateBoolean(createDataFileDto.archive ?? false, 'archive');

        this.loggerService.log(`Creating DataFile: ${shortName} (${longName})`, userId);
        // --- Create DataFile ---
        return this.prisma.dataFile.create({
            data: {
                shortName,
                longName,
                fileSize,

                fileLocation,
                docLink: createDataFileDto.docLink,
                archive,
                user: {
                    connect: {
                        username: userId,
                    }
                }
            },
        });


    }


    async findAllDataFiles(userId: string): Promise<DataFile[]> {
        // Logic remains the same
        return this.prisma.dataFile.findMany({
            where: { userId },
            orderBy: { shortName: 'asc' },
            include: {
                fields: {
                    select: { id: true, fieldName: true, fileId: true },
                    orderBy: { begPosition: 'asc' }
                }
            }
        });
    }

    async findOneDataFile(id: string, userId: string) {
        // Logic remains the same
        if (!id || typeof id !== 'string' || id.length < 5) {
            throw new BadRequestException('Invalid DataFile ID format.');
        }
        const dataFile = await this.prisma.dataFile.findUnique({
            where: { id },
            include: {
                fields: {
                    orderBy: { begPosition: 'asc' },
                    include: {
                        validData: { orderBy: { seqID: 'asc' } },
                        dataStructures: { orderBy: { dsID: 'asc' } },
                    },
                },
            },
        });
        if (!dataFile) {
            throw new NotFoundException(`DataFile with ID ${id} not found.`);
        }
        // if (dataFile.userId !== userId) {
        //     throw new ForbiddenException(`You do not have permission to access this DataFile.`);
        // }
        return dataFile;
    }

    async updateDataFile(id: string, updateDataFileDto: UpdateDataFileDto, userId: string): Promise<DataFile> {
        // Logic remains the same
        if (!id || typeof id !== 'string' || id.length < 5) {
            throw new BadRequestException('Invalid DataFile ID format.');
        }
        const existingFile = await this.prisma.dataFile.findUnique({
            where: { id }, select: { userId: true, user: { select: { username: true } } }
        });
        if (!existingFile) {
            throw new NotFoundException(`DataFile with ID ${id} not found.`);
        }
        if (existingFile.user.username !== userId) {
            throw new ForbiddenException(`You do not have permission to update this DataFile.`);
        }
        const dataToUpdate: Prisma.DataFileUpdateInput = {};
        if (updateDataFileDto.shortName !== undefined) {
            dataToUpdate.shortName = this.validateString(updateDataFileDto.shortName, 'shortName');
        }
        if (updateDataFileDto.longName !== undefined) {
            dataToUpdate.longName = this.validateString(updateDataFileDto.longName, 'longName');
        }
        if (updateDataFileDto.fileSize !== undefined) {
            dataToUpdate.fileSize = this.validateNumber(updateDataFileDto.fileSize, 'fileSize', 0);
        }
        if (updateDataFileDto.fileLocation !== undefined) {
            dataToUpdate.fileLocation = this.validateOptionalString(updateDataFileDto.fileLocation, 'fileLocation');
        }
        // if (updateDataFileDto.docLink !== undefined) {
        //     dataToUpdate.docLink = this.validateOptionalString(updateDataFileDto.docLink, 'docLink');
        // }
        if (updateDataFileDto.archive !== undefined) {
            dataToUpdate.archive = this.validateBoolean(updateDataFileDto.archive, 'archive');
        }
        if (Object.keys(dataToUpdate).length === 0) {
            throw new BadRequestException('No valid fields provided for update.');
        }
        this.loggerService.log(`Updated DataFile: ${id}`, userId);
        return this.prisma.dataFile.update({ where: { id }, data: dataToUpdate });
    }

    async deleteDataFile(id: string, userId: string): Promise<{ id: string }> { // Return simple confirmation
        if (!id || typeof id !== 'string' || id.length < 5) {
            throw new BadRequestException('Invalid DataFile ID format.');
        }
        // Verify ownership first - fetch the file data needed for return *before* deleting
        // NOTE: userId passed in is now assumed to be the USERNAME based on previous requests
        const dataFileToDelete = await this.prisma.dataFile.findUnique({
            where: { id },
            select: {
                id: true,
                user: { // Select the related user to get their username for the check
                    select: { username: true }
                }
            }
        });

        if (!dataFileToDelete) {
            console.warn(`Attempted to delete non-existent DataFile with ID ${id}.`);
            return { id }; // Indicate success/idempotency
        }

        // Use username for ownership check, matching your controller logic specification
        if (!dataFileToDelete.user || dataFileToDelete.user.username !== userId) {
            throw new ForbiddenException(`You do not have permission to delete this DataFile.`);
        }

        try {
            // Use a transaction for manual cascade delete
            await this.prisma.$transaction(async (tx) => {
                // 1. Find all related DataFields for this DataFile
                const fields = await tx.dataField.findMany({
                    where: { fileId: id },
                    select: { id: true }
                });
                const fieldIds = fields.map(f => f.id);

                // 2. If DataFields exist, delete their dependents first
                if (fieldIds.length > 0) {
                    // Delete ValidData associated with these fields
                    await tx.validData.deleteMany({
                        where: { fileFieldID: { in: fieldIds } }
                    });

                    // Delete DataStructures associated with these fields
                    await tx.dataStructure.deleteMany({
                        where: { fileFieldID: { in: fieldIds } }
                    });

                    // Delete the DataFields themselves
                    await tx.dataField.deleteMany({
                        where: { id: { in: fieldIds } } // or where: { fileId: id }
                    });
                }


                await tx.programKeyFile.deleteMany({
                    where: { dataFileId: id }
                });

                // 4. Finally, delete the DataFile itself (was step 5)
                await tx.dataFile.delete({
                    where: { id: id }
                });
            });
            this.loggerService.log(`Deleted DataFile: ${id}`, userId);
            // Return confirmation after successful transaction
            return { id: dataFileToDelete.id };

        } catch (error) {
            // Catch potential transaction errors or other issues
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') { // Record not found during transaction
                    throw new NotFoundException(`DataFile with ID ${id} was not found during deletion transaction.`);
                }
                // Log other Prisma errors if needed
                console.error(`Prisma Error deleting DataFile ID ${id}:`, error.code, error.meta);
            } else {
                // Log non-Prisma errors
                console.error(`Error during transaction for deleting DataFile ID ${id}:`, error);
            }
            // Throw a generic error to the client
            throw new InternalServerErrorException('Could not complete the deletion of the DataFile and its related records.');
        }
    }

    // == DataField Operations ==

    async createDataField(fileId: string, createDataFieldDto: CreateDataFieldDto, userId: string): Promise<DataField> {
        // Logic remains the same
        if (!fileId || typeof fileId !== 'string' || fileId.length < 5) {
            throw new BadRequestException('Invalid DataFile ID format.');
        }
        const dataFile = await this.prisma.dataFile.findUnique({
            where: { id: fileId },
            select: { user: { select: { username: true } }, fields: { orderBy: { endPosition: 'desc' }, take: 1 } }
        });
        if (!dataFile) {
            throw new NotFoundException(`DataFile with ID ${fileId} not found.`);
        }
        if (dataFile.user.username !== userId) {
            throw new ForbiddenException(`You do not have permission to add fields to this DataFile.`);
        }
        const fieldName = this.validateString(createDataFieldDto.fieldName, 'fieldName');
        const fieldSize = this.validateNumber(createDataFieldDto.fieldSize, 'fieldSize', 1);
        const description = this.validateOptionalString(createDataFieldDto.description, 'description');
        const packed = this.validateBoolean(createDataFieldDto.packed ?? false, 'packed');
        const validDataNotes = this.validateOptionalString(createDataFieldDto.validDataNotes, 'validDataNotes');
        const archive = this.validateBoolean(createDataFieldDto.archive ?? false, 'archive');
        let begPosition = 1;
        let endPosition = fieldSize;
        if (dataFile.fields.length > 0) {
            const lastField = dataFile.fields[0];
            begPosition = lastField.endPosition + 1;
            endPosition = begPosition + fieldSize - 1;
        }

        this.loggerService.log(`Created DataField: ${fieldName} (${fieldSize})`, userId);
        return this.prisma.dataField.create({
            data: {
                fieldName,
                fieldSize,
                description: description ?? '',
                packed,
                validDataNotes: validDataNotes ?? '',
                archive,
                begPosition,
                endPosition,
                fieldType: createDataFieldDto.fieldType,
                file: { connect: { id: fileId } }, // Connect to the DataFile
            },
        });

    }

    // Helper to verify field ownership (remains the same)
    private async verifyFieldOwnership(fieldId: string, userId: string, includeFile = true): Promise<DataField & { file?: { userId: string } }> {
        // Logic remains the same
        if (!fieldId || typeof fieldId !== 'string' || fieldId.length < 5) {
            throw new BadRequestException('Invalid DataField ID format.');
        }
        const field = await this.prisma.dataField.findUnique({
            where: { id: fieldId },
            include: { file: includeFile ? { select: { user: { select: { username: true } } } } : undefined }
        });
        if (!field) {
            throw new NotFoundException(`DataField with ID ${fieldId} not found.`);
        }
        // if (includeFile && field.file?.userId !== userId) {
        //     throw new ForbiddenException(`You do not have permission to access this DataField.`);
        // }
        return field as DataField & { file: { userId: string } };
    }

    async updateDataField(fieldId: string, updateDataFieldDto: UpdateDataFieldDto, userId: string): Promise<DataField> { // userId is username
        const field = await this.verifyFieldOwnership(fieldId, userId);

        const dataToUpdate: Prisma.DataFieldUpdateInput = {};
        let newSize: number | undefined = undefined;

        // Validate standard fields
        if (updateDataFieldDto.fieldName !== undefined) dataToUpdate.fieldName = this.validateString(updateDataFieldDto.fieldName, 'fieldName');
        if (updateDataFieldDto.description !== undefined) dataToUpdate.description = this.validateOptionalString(updateDataFieldDto.description, 'description');
        if (updateDataFieldDto.packed !== undefined) dataToUpdate.packed = this.validateBoolean(updateDataFieldDto.packed, 'packed');
        if (updateDataFieldDto.validDataNotes !== undefined) dataToUpdate.validDataNotes = this.validateOptionalString(updateDataFieldDto.validDataNotes, 'validDataNotes');
        if (updateDataFieldDto.archive !== undefined) dataToUpdate.archive = this.validateBoolean(updateDataFieldDto.archive, 'archive');


        // Validate fieldSize separately
        if (updateDataFieldDto.fieldSize !== undefined) {
            newSize = this.validateNumber(updateDataFieldDto.fieldSize, 'fieldSize', 1);
            dataToUpdate.fieldSize = newSize;
        }

        if (Object.keys(dataToUpdate).length === 0) throw new BadRequestException('No valid fields provided for update.');

        // Handle position recalculation if fieldSize changes
        if (newSize !== undefined && newSize !== field.fieldSize) {
            const sizeDifference = newSize - field.fieldSize;
            return this.prisma.$transaction(async (tx) => {
                // Update target field's size and INCLUSIVE endPosition
                const newEndPosition = field.begPosition + newSize - 1;
                const updatedField = await tx.dataField.update({
                    where: { id: fieldId },
                    data: { ...dataToUpdate, endPosition: newEndPosition }, // Pass validated updates
                });
                // Find and Shift subsequent fields
                const subsequentFields = await tx.dataField.findMany({ where: { fileId: field.fileId, begPosition: { gt: field.begPosition } }, orderBy: { begPosition: 'asc' } });
                for (const subField of subsequentFields) {
                    await tx.dataField.update({ where: { id: subField.id }, data: { begPosition: subField.begPosition + sizeDifference, endPosition: subField.endPosition + sizeDifference } });
                }
                return updatedField;
            });
        } else {
            // Simple update (no size change)
            return this.prisma.dataField.update({ where: { id: fieldId }, data: dataToUpdate });
        }
    }


    /**
     * Deletes a DataField and manually cascades deletes to related ValidData
     * and DataStructures within a transaction.
     * Note: This does NOT currently recalculate positions of subsequent fields.
     */
    async deleteDataField(fieldId: string, userId: string): Promise<{ id: string }> { // Return simple confirmation
        // verifyFieldOwnership also validates fieldId format and ownership
        const fieldToDelete = await this.verifyFieldOwnership(fieldId, userId, false); // Don't need file info here

        try {
            await this.prisma.$transaction(async (tx) => {
                await tx.validData.deleteMany({
                    where: { fileFieldID: fieldId }
                });
                await tx.dataStructure.deleteMany({
                    where: { fileFieldID: fieldId }
                });
                await tx.dataField.delete({
                    where: { id: fieldId }
                });
            });

            this.loggerService.log(`Deleted DataField: ${fieldId}`, userId);

            return { id: fieldToDelete.id };

        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`DataField with ID ${fieldId} was not found during deletion transaction.`);
            }
            console.error(`Error during transaction for deleting DataField ID ${fieldId}:`, error);
            throw new InternalServerErrorException('Could not complete the deletion of the DataField and its related records.');
        }
    }


    async createValidData(fieldId: string, createValidDataDto: CreateValidDataDto, userId: string): Promise<ValidData> {
        // Logic remains the same
        await this.verifyFieldOwnership(fieldId, userId);
        const validDataValue = this.validateString(createValidDataDto.validData, 'validData');
        const validDataDesc = this.validateString(createValidDataDto.validDataDesc, 'validDataDesc');
        const archive = this.validateBoolean(createValidDataDto.archive ?? false, 'archive');
        const lastValidData = await this.prisma.validData.findFirst({
            where: { fileFieldID: fieldId }, orderBy: { seqID: 'desc' }, select: { seqID: true }
        });
        const nextSeqId = lastValidData ? lastValidData.seqID + 1 : 1;

        this.loggerService.log(`Created ValidData: ${validDataValue} (${validDataDesc})`, userId);
        return this.prisma.validData.create({
            data: {
                validData: validDataValue, validDataDesc, archive,
                fileFieldID: fieldId, seqID: nextSeqId,
            },
        });
    }

    // Helper to verify ValidData ownership (remains the same)
    private async verifyValidDataOwnership(validDataId: string, userId: string): Promise<ValidData & { field: { file: { userId: string } } }> {

        console.log("ValidData ID:", userId); // Debugging line to check the ID format

        // Logic remains the same
        if (!validDataId || typeof validDataId !== 'string' || validDataId.length < 5) {
            throw new BadRequestException('Invalid ValidData ID format.');
        }
        const validData = await this.prisma.validData.findUnique({
            where: { id: validDataId },
            include: {
                field: {
                    include: {
                        file: {
                            select: {
                                user: {
                                    select: { username: true }
                                },

                            }
                        }
                    }
                }
            }
        });

        if (!validData) {
            throw new NotFoundException(`ValidData with ID ${validDataId} not found.`);
        }
        if (!validData.field || !validData.field.file || validData.field.file.user.username !== userId) {
            throw new ForbiddenException(`You do not have permission to access this ValidData.`);
        }
        return {
            ...validData,
            field: {
                ...validData.field,
                file: {
                    userId: validData.field.file.user.username ?? '',
                },
            },
        };
    }


    async updateValidData(validDataId: string, updateValidDataDto: UpdateValidDataDto, userId: string): Promise<ValidData> {
        // Logic remains the same
        await this.verifyValidDataOwnership(validDataId, userId);
        const dataToUpdate: Prisma.ValidDataUpdateInput = {};
        if (updateValidDataDto.validData !== undefined) {
            dataToUpdate.validData = this.validateString(updateValidDataDto.validData, 'validData');
        }
        if (updateValidDataDto.validDataDesc !== undefined) {
            dataToUpdate.validDataDesc = this.validateString(updateValidDataDto.validDataDesc, 'validDataDesc');
        }
        if (updateValidDataDto.archive !== undefined) {
            dataToUpdate.archive = this.validateBoolean(updateValidDataDto.archive, 'archive');
        }
        if (Object.keys(dataToUpdate).length === 0) {
            throw new BadRequestException('No valid fields provided for update.');
        }
        this.loggerService.log(`Updated ValidData: ${validDataId}`, userId);
        return this.prisma.validData.update({ where: { id: validDataId }, data: dataToUpdate });
    }

    async deleteValidData(validDataId: string, userId: string): Promise<ValidData> {
        // Logic remains the same (ValidData has no children to cascade delete)
        const validData = await this.verifyValidDataOwnership(validDataId, userId);
        try {
            this.loggerService.log(`Deleted ValidData: ${validDataId}`, userId);
            return await this.prisma.validData.delete({ where: { id: validDataId } });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`ValidData with ID ${validDataId} not found for deletion.`);
            }
            console.error("Error deleting ValidData:", error);
            throw new InternalServerErrorException('Could not delete the ValidData.');
        }
    }
}