// src/components/process/processTypes.ts

// --- Input DTOs (Frontend sends these) ---
export type CreateProcessDto = {
    processName: string;
    processDescription?: string;
    programType?: string;
    keyProgrammers?: string; // Comma-separated
    keyUsers?: string;       // Comma-separated
    archive?: boolean;
};

export type UpdateProcessDto = Partial<CreateProcessDto>;

export type CreateProcessStepDto = {
    seqID: string;
    processStep: string;
    processStepDesc?: string;
    processStepNotes?: string;
    archive?: boolean;
};

export type UpdateProcessStepDto = Partial<Omit<CreateProcessStepDto, 'seqID'>>;

// --- Response DTOs (Frontend receives these) ---
export type AuthorInfo = {
    id: string;
    username: string | null;
    name: string | null;
};

export type ProcessListItemDto = {
    id: string; // Changed from number
    processName: string;
    processDescription?: string | null;
    programType?: string | null;
    archive: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    author?: AuthorInfo | null;
    _count?: { steps: number };
};

export type ProcessStepDetailsDto = {
    id: string; // Changed from number
    processId: string;
    seqID: string;
    processStep: string;
    processStepDesc?: string | null;
    processStepNotes?: string | null;
    archive: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    author?: AuthorInfo | null;
    // Key Programs/Files would go here if fetched
    // keyPrograms: ProcessStepKeyProgramDto[];
    // keyFiles: ProcessStepKeyFileDto[];
};

export type ProcessDetailsDto = {
    id: string; // Changed from number
    processName: string;
    processDescription?: string | null;
    programType?: string | null;
    keyProgrammers: string[]; // Array from backend
    keyUsers: string[];       // Array from backend
    archive: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    author?: AuthorInfo | null;
    steps: ProcessStepDetailsDto[]; // Nested steps
};

// --- Frontend-Specific Type (For Step Form/Dialog) ---
export type ProcessStepFormData = Partial<Omit<ProcessStepDetailsDto, 'createdAt' | 'updatedAt' | 'author' | 'processId' | 'keyPrograms' | 'keyFiles'>> & {
    // Include fields needed for the form that might be partial
    id?: string; // Optional for create vs update
    seqID?: string;
    processStep?: string;
    processStepDesc?: string;
    processStepNotes?: string;
    archive?: boolean;
};