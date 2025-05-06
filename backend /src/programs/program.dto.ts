// src/program/program.dto.ts

// Use interfaces or types for DTO definitions without decorators

export type CreateProgramDto = {
    programName: string;
    runningLocation?: string;
    sourceLocation?: string;
    programType?: string;
    programDescription?: string;
    keyProgrammers?: string; // Comma-separated string expected from client
    keyUsers?: string;       // Comma-separated string expected from client
    archive?: boolean;
};

export type UpdateProgramDto = Partial<CreateProgramDto>; // Allows partial updates

export type CreateProgramKeyFileDto = {
    dataFileId: string; // ID of the DataFile being linked
    programFileNotes?: string;
    archive?: boolean;
};

// No Update DTO for KeyFile needed if only deleting/adding

export type CreateProgramNoteDto = {
    programNotes: string;
    archive?: boolean;
    // Note: The user ID/username for the note author comes from the request context
};

// No Update DTO for Note needed if only deleting/adding

// --- Response Types (Optional but Recommended) ---
// These help define the shape of data returned to the client

export type ProgramResponseDto = {
    id: string;
    programName: string;
    runningLocation?: string | null;
    sourceLocation?: string | null;
    programType?: string | null;
    programDescription?: string | null;
    keyProgrammers: string[]; // Return as array
    keyUsers: string[];       // Return as array
    archive: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    userId: string;
    // Optionally include counts or basic info for explorer view
    _count?: {
        keyFiles: number;
        notes: number;
    }
    // Or basic lists for explorer view
    keyFiles?: { seqID: number; dataFileId: string }[];
    notes?: { seqID: number; userId: string }[];
};

export type ProgramDetailsResponseDto = ProgramResponseDto & {
    keyFiles: ProgramKeyFileResponseDto[]; // Full details
    notes: ProgramNoteResponseDto[];       // Full details
};

export type ProgramKeyFileResponseDto = {
    programId: string;
    seqID: number;
    dataFileId: string;
    programFileNotes?: string | null;
    archive: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    dataFile?: { // Include basic file info for display
        shortName: string;
        longName: string;
    } | null;
};

export type ProgramNoteResponseDto = {
    programId: string;
    seqID: number;
    programNotes: string;
    userId: string;
    archive: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    user?: { // Include basic user info for display
        username: string | null;
        name: string | null;
    } | null;
};

export type UpdateProgramKeyFileDto = {
    programFileNotes?: string | null; // Optional: Allow setting notes or clearing them (null)
    archive?: boolean;                // Optional: Allow updating archive status
};
