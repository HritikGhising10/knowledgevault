// src/process/process.dto.ts

// --- Input DTOs ---

export type CreateProcessDto = {
    processName: string;
    processDescription?: string;
    programType?: string;       // e.g., "PC", "Mainframe"
    keyProgrammers?: string;    // Comma-separated string from client
    keyUsers?: string;          // Comma-separated string from client
    archive?: boolean;
};

export type UpdateProcessDto = Partial<CreateProcessDto>;

export type CreateProcessStepDto = {
    seqID: string;              // Sequence identifier (e.g., "01", "02a")
    processStep: string;        // Name/Title of the step
    processStepDesc?: string;
    processStepNotes?: string;
    archive?: boolean;
};

export type UpdateProcessStepDto = Partial<Omit<CreateProcessStepDto, 'seqID'>>; // SeqID usually not updatable directly

export type AddKeyProgramDto = {
    programId: string;          // CUID of the Program to link
    seqID: number;              // Sequence number for this program within the step
    processProgramNotes?: string;
};

export type AddKeyFileDto = {
    dataFileId: string;         // CUID of the DataFile to link
    seqID: number;              // Sequence number for this file within the step
    processFileNotes?: string;
};

// --- Response DTOs (Example Structure) ---

export type AuthorInfo = { // Reusable author info
    id: string;
    username: string | null;
    name: string | null;
};

export type ProcessListItemDto = {
    id: string;
    processName: string;
    processDescription?: string | null;
    programType?: string | null;
    archive: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    author?: AuthorInfo | null; // Basic author info
    _count?: { steps: number }; // Optional step count
};

export type ProcessStepKeyProgramDto = {
    programId: string;
    seqID: number;
    processProgramNotes?: string | null;
    program?: { // Include basic program info
        programName: string;
    } | null;
};

export type ProcessStepKeyFileDto = {
    dataFileId: string;
    seqID: number;
    processFileNotes?: string | null;
    dataFile?: { // Include basic file info
        shortName: string;
        longName: string;
    } | null;
};

export type ProcessStepDetailsDto = {
    id: string;
    processId: string;
    seqID: string;
    processStep: string;
    processStepDesc?: string | null;
    processStepNotes?: string | null;
    archive: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    author?: AuthorInfo | null;
    keyPrograms: ProcessStepKeyProgramDto[];
    keyFiles: ProcessStepKeyFileDto[];
};

export type ProcessDetailsDto = {
    id: string;
    processName: string;
    processDescription?: string | null;
    programType?: string | null;
    keyProgrammers: string[]; // Return arrays
    keyUsers: string[];       // Return arrays
    archive: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    author?: AuthorInfo | null;
    steps: ProcessStepDetailsDto[]; // Include full steps
};