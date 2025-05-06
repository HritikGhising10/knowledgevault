"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash, Edit, FileCode, ChevronDown, ChevronRight, Save, FileText, Loader2 } from "lucide-react" // Added Loader2
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataFile } from "../Files/Files"
import { API_BASE_URL } from "@/apiRoute"
// Optional: import { toast } from "sonner";

// --- Auth Header Helper ---
const getAuthHeader = (): HeadersInit => {
    const token = localStorage.getItem("token"); // Assuming token is stored in localStorage
    if (token) {
        return { 'Authorization': `Bearer ${token}` };
    }
    return {};
};

// --- Generic API Request Helper ---
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...options.headers,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json(); // Attempt to parse error response body
            } catch (e) {
                errorData = { message: response.statusText }; // Fallback if no JSON body
            }
            console.error("API Error Response:", errorData);
            // toast.error(`API Error (${response.status}): ${errorData?.message || response.statusText}`);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData?.message || response.statusText}`);
        }

        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return undefined as T; // Handle No Content responses (e.g., DELETE)
        }

        return await response.json() as T; // Parse successful response
    } catch (error) {
        console.error('API Request Failed:', error);
        // toast.error(`Request Failed: ${error.message}`);
        throw error; // Re-throw to be handled by calling function
    }
}

// --- Frontend Types Aligned with Backend DTOs/Schema ---

// Option for DataFile select dropdown
interface DataFileOption {
    id: string;
    shortName: string;
}

// Response type for Program Key Files (including nested DataFile info)
interface ProgramKeyFileResponseDto {
    programId: string;
    seqID: number;
    dataFileId: string;
    programFileNotes?: string | null;
    archive: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    dataFile?: { // From include in backend service
        shortName: string;
        longName: string;
    } | null;
}

// Response type for Program Notes (including nested User info)
interface ProgramNoteResponseDto {
    programId: string;
    seqID: number;
    programNotes: string;
    userId: string;
    archive: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    user?: { // From include in backend service
        username: string | null;
        name: string | null;
    } | null;
}

// Response type for Program list (explorer view - may have counts)
interface ProgramResponseDto {
    id: string;
    programName: string;
    runningLocation?: string | null;
    sourceLocation?: string | null;
    programType?: string | null;
    programDescription?: string | null;
    keyProgrammers: string[]; // Stored as array in DB
    keyUsers: string[];       // Stored as array in DB
    archive: boolean;
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    userId: string;
    _count?: { // Optional counts from backend query
        keyFiles: number;
        notes: number;
    }
}

// Response type for detailed Program view (includes nested arrays)
interface ProgramDetailsResponseDto extends Omit<ProgramResponseDto, '_count'> {
    keyFiles: ProgramKeyFileResponseDto[];
    notes: ProgramNoteResponseDto[];
}

// --- Component ---

function Programs() {
    // State for fetched data
    const [programs, setPrograms] = useState<ProgramResponseDto[]>([]);
    const [selectedProgram, setSelectedProgram] = useState<ProgramDetailsResponseDto | null>(null);
    const [dataFilesForSelect, setDataFilesForSelect] = useState<DataFileOption[]>([]); // For dropdown

    // UI State
    const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isLoadingDataFiles, setIsLoadingDataFiles] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCreateProgramDialog, setShowCreateProgramDialog] = useState(false);
    const [activeTabCreate, setActiveTabCreate] = useState("program"); // For create dialog tabs (if needed)
    const [expandedPrograms, setExpandedPrograms] = useState<string[]>([]); // Use string IDs
    const [selectedSectionInSidebar, setSelectedSectionInSidebar] = useState<"keyFiles" | "notes" | null>(null); // Renamed for clarity
    const [activeTabInDetails, setActiveTabInDetails] = useState("details"); // For details panel tabs


    // State for editing the selected program details
    const [editedProgramDetails, setEditedProgramDetails] = useState<Partial<ProgramDetailsResponseDto>>({});
    const [isEditMode, setIsEditMode] = useState(false);

    // State for new program creation form
    const [newProgram, setNewProgram] = useState<Omit<ProgramResponseDto, "id" | "userId" | "createdAt" | "updatedAt" | "_count">>({
        programName: "", runningLocation: "", sourceLocation: "", programType: "",
        programDescription: "", keyProgrammers: [], keyUsers: [], archive: false,
    });
    // Temporary state for comma-separated input in create dialog
    const [newKeyProgrammersStr, setNewKeyProgrammersStr] = useState("");
    const [newKeyUsersStr, setNewKeyUsersStr] = useState("");

    // State for new key file creation form
    const [newKeyFile, setNewKeyFile] = useState<{ dataFileId: string; programFileNotes: string; archive: boolean; }>({
        dataFileId: "", programFileNotes: "", archive: false,
    });

    // State for new note creation form
    const [newNote, setNewNote] = useState<{ programNotes: string; archive: boolean; }>({
        programNotes: "", archive: false,
    });
    // Temporary state for adding people in edit mode
    const [programmerToAdd, setProgrammerToAdd] = useState("");
    const [userToAdd, setUserToAdd] = useState("");

    // --- State for Create DataFile Dialog (Reused from Files component logic) ---
    const [showCreateDataFileDialog, setShowCreateDataFileDialog] = useState(false);
    // State for the new DataFile form within the dialog
    const [newDataFile, setNewDataFile] = useState<Omit<DataFile, "id" | "userId" | "createdAt" | "updatedAt" | "fields" | "ProgramKeyFile" | "ProcessStepKeyFile">>({ // Match DataFile properties
        shortName: "",
        longName: "",
        fileLocation: "",
        fileSize: 0,
        docLink: "",
        archive: false,
    });
    const [isCreatingDataFile, setIsCreatingDataFile] = useState(false); // Specific loading state
    const [createDataFileError, setCreateDataFileError] = useState<string | null>(null);
    // ------------------------------------------------------------------------
    // --- Edit Key File Handlers ---
    const handleOpenEditKeyFileDialog = (keyFile: ProgramKeyFileResponseDto) => {
        setEditingKeyFile(keyFile);
        // Initialize edit form data with current key file values
        setEditKeyFileFormData({
            programFileNotes: keyFile.programFileNotes ?? "", // Handle null
            archive: keyFile.archive,
        });
        setShowEditKeyFileDialog(true);
    };
    // --- NEW: State for Editing Key Files ---
    const [editingKeyFile, setEditingKeyFile] = useState<ProgramKeyFileResponseDto | null>(null); // Store the KeyFile being edited
    const [showEditKeyFileDialog, setShowEditKeyFileDialog] = useState(false);
    // State for the edit form's data (only notes and archive are typically editable for a link)
    const [editKeyFileFormData, setEditKeyFileFormData] = useState<{ programFileNotes?: string | null; archive?: boolean; }>({});
    // ----------------------------------------

    const handleEditKeyFileChange = (field: keyof typeof editKeyFileFormData, value: string | boolean | null) => {
        // Ensure 'null' is handled correctly if Textarea value can be empty becoming null/undefined
        setEditKeyFileFormData(prev => ({ ...prev, [field]: value ?? "" })); // Default to empty string if value is nullish
    };

    const handleUpdateKeyFile = async () => {
        if (!editingKeyFile || !selectedProgram) return;
        // Optional: Add validation if notes are required etc.

        setIsSaving(true); // Use general saving state
        setError(null);

        // NOTE: Updating Key Files likely needs a specific PATCH endpoint.
        // We'll assume an endpoint like `/programs/:programId/keyfiles/:seqId` exists for updating the link notes/archive.
        // If not, the backend needs adjustment.
        const url = `/programs/${selectedProgram.id}/keyfiles/${editingKeyFile.seqID}`; // Assumed endpoint for PATCH/PUT
        const dto: Partial<typeof editKeyFileFormData> = { ...editKeyFileFormData };

        try {
            // Adjust expected response type if necessary. Assumes PATCH returns the updated link.
            await apiRequest<ProgramKeyFileResponseDto>(url, { method: 'PATCH', body: JSON.stringify(dto) });
            setShowEditKeyFileDialog(false); // Close dialog
            setEditingKeyFile(null);         // Clear editing state
            setEditKeyFileFormData({});      // Clear form data
            await fetchProgramDetails(selectedProgram.id); // Refresh details
            setActiveTabInDetails("keyFiles"); // Stay on tab
            // toast.success("Key file link updated."); // Optional
        } catch (err: any) {
            setError(err.message || "Failed to update key file link.");
            // Keep dialog open on error
        } finally {
            setIsSaving(false);
        }
    };
    // -------------------------------
    // --- Handler for Creating a New DataFile (from Dialog) ---
    const handleCreateDataFile = async () => {
        // Basic Validation
        if (!newDataFile.shortName || !newDataFile.longName || newDataFile.fileSize < 0) {
            setCreateDataFileError("Short Name, Long Name, and a valid File Size are required.");
            return;
        }
        setIsCreatingDataFile(true);
        setCreateDataFileError(null);
        try {
            // Assuming backend expects CreateDataFileDto structure
            const createdFile = await apiRequest<{ id: string; shortName: string }>('/datafiles', { // Fetch minimal data needed
                method: 'POST',
                body: JSON.stringify(newDataFile),
            });
            setShowCreateDataFileDialog(false); // Close dialog on success
            setNewDataFile({ shortName: "", longName: "", fileLocation: "", fileSize: 0, docLink: "", archive: false }); // Reset form
            // toast.success(`DataFile "${createdFile.shortName}" created.`); // Optional
            await fetchDataFilesForSelect(); // Refresh the dropdown list!

            // Optionally auto-select the new file in the 'Add New Key File' form
            setNewKeyFile(prev => ({ ...prev, dataFileId: createdFile.id }));

        } catch (err: any) {
            setCreateDataFileError(err.message || "Failed to create file.");
            // Keep dialog open on error
        } finally {
            setIsCreatingDataFile(false);
        }
    };
    // ----------------------------------------------------------


    // --- Data Fetching ---

    const fetchPrograms = useCallback(async () => {
        setIsLoadingPrograms(true);
        setError(null);
        try {
            const data = await apiRequest<ProgramResponseDto[]>('/programs');
            setPrograms(data);
        } catch (err: any) {
            setError(err.message || "Failed to fetch programs.");
            setPrograms([]);
        } finally {
            setIsLoadingPrograms(false);
        }
    }, []);



    const fetchProgramDetails = useCallback(async (programId: string) => {
        setIsLoadingDetails(true);
        setError(null);
        setSelectedProgram(null); // Clear previous selection immediately
        try {
            const data = await apiRequest<ProgramDetailsResponseDto>(`/programs/${programId}`);
            setSelectedProgram(data);
            setEditedProgramDetails({}); // Reset edits
            setIsEditMode(false);         // Exit edit mode
            setActiveTabInDetails(selectedSectionInSidebar || "details"); // Set initial tab based on sidebar click or default
        } catch (err: any) {
            setError(err.message || `Failed to fetch details for program ${programId}.`);
            setSelectedProgram(null);
        } finally {
            setIsLoadingDetails(false);
        }
    }, [selectedSectionInSidebar]); // Depend on sidebar selection

    const fetchDataFilesForSelect = useCallback(async () => {
        setIsLoadingDataFiles(true);
        try {
            // Assuming you have an endpoint to get basic DataFile list
            // Adjust endpoint if necessary
            const data = await apiRequest<{ id: string; shortName: string }[]>('/datafiles'); // Fetch only needed fields
            setDataFilesForSelect(data);
        } catch (err: any) {
            console.error("Failed to fetch data files for select:", err);
            // toast.error("Could not load list of data files.");
            setDataFilesForSelect([]);
        } finally {
            setIsLoadingDataFiles(false);
        }
    }, []);

    // Initial data load
    useEffect(() => {
        fetchPrograms();
        fetchDataFilesForSelect();
    }, [fetchPrograms, fetchDataFilesForSelect]); // Ensure these are stable dependencies

    // --- Event Handlers ---

    // Handle program selection from explorer
    const handleSelectProgram = (program: ProgramResponseDto) => {
        setSelectedSectionInSidebar(null); // Reset section selection
        if (selectedProgram?.id !== program.id || !selectedProgram) {
            fetchProgramDetails(program.id);
        }
        // Optionally expand
        if (!expandedPrograms.includes(program.id)) {
            toggleProgramExpansion(program.id);
        }
    };

    // Handle section selection (Key Files / Notes) from explorer
    const handleSelectSection = (program: ProgramResponseDto, section: "keyFiles" | "notes") => {
        setSelectedSectionInSidebar(section);
        if (selectedProgram?.id !== program.id || !selectedProgram) {
            fetchProgramDetails(program.id); // Will also set the active tab
        } else {
            // If program already selected, just switch the tab
            setActiveTabInDetails(section);
        }
    }

    // Toggle program expansion in sidebar
    const toggleProgramExpansion = (programId: string) => {
        setExpandedPrograms(prev =>
            prev.includes(programId) ? prev.filter(id => id !== programId) : [...prev, programId]
        );
    };

    // Create new program
    const handleCreateProgram = async () => {
        setIsSaving(true);
        setError(null);
        try {
            // Prepare DTO, converting comma-separated strings to arrays if backend expects arrays directly
            // Backend service currently parses comma-sep strings, so send as-is
            const dto: CreateProgramDto = {
                ...newProgram,
                keyProgrammers: newKeyProgrammersStr, // Send the comma-separated string
                keyUsers: newKeyUsersStr,         // Send the comma-separated string
            };

            const createdProgram = await apiRequest<ProgramResponseDto>('/programs', {
                method: 'POST',
                body: JSON.stringify(dto),
            });
            setShowCreateProgramDialog(false);
            // Reset form states
            setNewProgram({ programName: "", runningLocation: "", sourceLocation: "", programType: "", programDescription: "", keyProgrammers: [], keyUsers: [], archive: false });
            setNewKeyProgrammersStr("");
            setNewKeyUsersStr("");
            // toast.success(`Program "${createdProgram.programName}" created.`);
            await fetchPrograms(); // Refresh list
            handleSelectProgram(createdProgram); // Optionally select the new program

        } catch (err: any) {
            setError(err.message || "Failed to create program.");
        } finally {
            setIsSaving(false);
        }
    };

    // Add key file to selected program
    const handleAddKeyFile = async () => {
        if (!selectedProgram) return;
        setIsSaving(true);
        setError(null);
        try {
            const dto: CreateProgramKeyFileDto = {
                dataFileId: newKeyFile.dataFileId, // Ensure this is the string CUID
                programFileNotes: newKeyFile.programFileNotes,
                archive: newKeyFile.archive,
            };
            await apiRequest<ProgramKeyFileResponseDto>(`/programs/${selectedProgram.id}/keyfiles`, {
                method: 'POST',
                body: JSON.stringify(dto),
            });
            setNewKeyFile({ dataFileId: "", programFileNotes: "", archive: false }); // Reset form
            // toast.success(`Key file added.`);
            await fetchProgramDetails(selectedProgram.id); // Refresh details
        } catch (err: any) {
            setError(err.message || "Failed to add key file.");
        } finally {
            setIsSaving(false);
        }
    };

    // Add note to selected program
    const handleAddNote = async () => {
        if (!selectedProgram) return;
        setIsSaving(true);
        setError(null);
        try {
            const dto: CreateProgramNoteDto = { // UserID is set by backend based on token
                programNotes: newNote.programNotes,
                archive: newNote.archive,
            };
            await apiRequest<ProgramNoteResponseDto>(`/programs/${selectedProgram.id}/notes`, {
                method: 'POST',
                body: JSON.stringify(dto),
            });
            setNewNote({ programNotes: "", archive: false }); // Reset form
            // toast.success(`Note added.`);
            await fetchProgramDetails(selectedProgram.id); // Refresh details
        } catch (err: any) {
            setError(err.message || "Failed to add note.");
        } finally {
            setIsSaving(false);
        }
    };

    // Delete a program
    const handleDeleteProgram = async (programId: string, programName: string) => {
        if (!window.confirm(`Are you sure you want to delete program "${programName}" and all its data?`)) return;
        setIsSaving(true);
        setError(null);
        try {
            await apiRequest(`/programs/${programId}`, { method: 'DELETE' });
            // toast.success(`Program "${programName}" deleted.`);
            if (selectedProgram?.id === programId) {
                setSelectedProgram(null);
                setSelectedSectionInSidebar(null);
                setActiveTabInDetails("details");
                setIsEditMode(false);
            }
            await fetchPrograms(); // Refresh list
        } catch (err: any) {
            setError(err.message || "Failed to delete program.");
        } finally {
            setIsSaving(false);
        }
    };

    // Delete a key file
    const handleDeleteKeyFile = async (programId: string, seqId: number, fileName?: string) => {
        if (!window.confirm(`Are you sure you want to delete key file sequence ${seqId} (${fileName || 'N/A'})?`)) return;
        setIsSaving(true);
        setError(null);
        try {
            await apiRequest(`/programs/${programId}/keyfiles/${seqId}`, { method: 'DELETE' });
            // toast.success(`Key file sequence ${seqId} deleted.`);
            if (selectedProgram?.id === programId) {
                await fetchProgramDetails(programId); // Refresh details
            }
        } catch (err: any) {
            setError(err.message || "Failed to delete key file.");
        } finally {
            setIsSaving(false);
        }
    };

    // Delete a note
    const handleDeleteNote = async (programId: string, seqId: number) => {
        if (!window.confirm(`Are you sure you want to delete note sequence ${seqId}?`)) return;
        setIsSaving(true);
        setError(null);
        try {
            await apiRequest(`/programs/${programId}/notes/${seqId}`, { method: 'DELETE' });
            // toast.success(`Note sequence ${seqId} deleted.`);
            if (selectedProgram?.id === programId) {
                await fetchProgramDetails(programId); // Refresh details
            }
        } catch (err: any) {
            setError(err.message || "Failed to delete note.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Edit Mode Handling ---
    const handleEditToggle = () => {
        if (isEditMode) { // Cancel
            setIsEditMode(false);
            setEditedProgramDetails({});
            setProgrammerToAdd(""); // Reset temp states
            setUserToAdd("");
        } else { // Start editing
            if (!selectedProgram) return;
            // Set initial edit state from selected program
            setEditedProgramDetails({
                programName: selectedProgram.programName,
                runningLocation: selectedProgram.runningLocation,
                sourceLocation: selectedProgram.sourceLocation,
                programType: selectedProgram.programType,
                programDescription: selectedProgram.programDescription,
                // Keep arrays as arrays for editing logic
                keyProgrammers: [...selectedProgram.keyProgrammers],
                keyUsers: [...selectedProgram.keyUsers],
                archive: selectedProgram.archive,
            });
            setIsEditMode(true);
        }
    };

    // Handle simple input changes in Edit Mode
    const handleEditInputChange = (field: keyof UpdateProgramDto, value: string | number | boolean) => {
        setEditedProgramDetails(prev => ({ ...prev, [field]: value }));
    };

    // Handle ADDING a programmer/user in Edit Mode
    const handleAddPerson = (type: "programmer" | "user") => {
        const value = type === "programmer" ? programmerToAdd.trim() : userToAdd.trim();
        if (!value) return;

        const field = type === "programmer" ? "keyProgrammers" : "keyUsers";
        const currentValues = editedProgramDetails[field] ?? [];

        if (!currentValues.includes(value)) {
            setEditedProgramDetails(prev => ({
                ...prev,
                [field]: [...currentValues, value]
            }));
        }
        // Clear the respective input field
        if (type === "programmer") setProgrammerToAdd("");
        else setUserToAdd("");
    };

    // Handle REMOVING a programmer/user in Edit Mode
    const handleRemovePerson = (type: "programmer" | "user", valueToRemove: string) => {
        const field = type === "programmer" ? "keyProgrammers" : "keyUsers";
        setEditedProgramDetails(prev => ({
            ...prev,
            [field]: (prev[field] ?? []).filter(v => v !== valueToRemove)
        }));
    };


    // Save Changes (PATCH request)
    const handleSaveChanges = async () => {
        if (!selectedProgram || !isEditMode) return;
        setIsSaving(true);
        setError(null);
        try {
            // Prepare DTO for PATCH - backend service expects comma-sep string for arrays
            const dtoToSave: UpdateProgramDto = {
                ...editedProgramDetails,
                // Convert arrays back to comma-separated strings for the backend DTO
                keyProgrammers: editedProgramDetails.keyProgrammers?.join(', '),
                keyUsers: editedProgramDetails.keyUsers?.join(', '),
            };
            // Remove undefined fields as it's a PATCH
            Object.keys(dtoToSave).forEach(key => dtoToSave[key] === undefined && delete dtoToSave[key]);

            const updatedProgram = await apiRequest<ProgramDetailsResponseDto>(`/programs/${selectedProgram.id}`, {
                method: 'PATCH',
                body: JSON.stringify(dtoToSave),
            });
            setSelectedProgram(updatedProgram); // Update main state with response
            setIsEditMode(false);
            setEditedProgramDetails({});
            setProgrammerToAdd("");
            setUserToAdd("");
            // toast.success(`Program "${updatedProgram.programName}" updated.`);
            // Refresh list in case name changed
            await fetchPrograms();
        } catch (err: any) {
            setError(err.message || "Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Derived State & Display Helpers ---
    const currentKeyFiles = selectedProgram?.keyFiles ?? [];
    const currentNotes = selectedProgram?.notes ?? [];

    // Use edit state if in edit mode, otherwise use selectedProgram
    const getDisplayValue = <K extends keyof ProgramDetailsResponseDto>(field: K): ProgramDetailsResponseDto[K] | undefined => {
        if (isEditMode && editedProgramDetails[field] !== undefined) {
            // Type assertion needed as editedProgramDetails is Partial
            return editedProgramDetails[field] as ProgramDetailsResponseDto[K];
        }
        return selectedProgram ? selectedProgram[field] : undefined;
    }


    return (
        <div className="container mx-auto p-4">
            {/* Global Loading/Error/Saving Indicators */}
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">Error: {error}</div>}
            {(isLoadingPrograms || isLoadingDetails || isSaving || isLoadingDataFiles) && (
                <div className="fixed top-4 right-4 z-50 p-2 bg-blue-100 text-blue-700 rounded shadow flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                    <span>{isSaving ? 'Saving...' : 'Loading...'}</span>
                </div>
            )}

            {/* --- Edit Key File Dialog --- */}
            <Dialog open={showEditKeyFileDialog} onOpenChange={setShowEditKeyFileDialog}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>Edit Key File Link (Seq: {editingKeyFile?.seqID})</DialogTitle>
                        <DialogDescription>
                            Update notes and archive status for file: <span className="font-medium">{editingKeyFile?.dataFile?.shortName ?? 'N/A'}</span>
                        </DialogDescription>
                    </DialogHeader>
                    {/* Display Error specific to this dialog */}
                    {error && isSaving && (<div className="my-2 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">{error}</div>)}

                    <div className="grid gap-4 py-4">
                        {/* File Name (Readonly) */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">File</Label>
                            <div className="col-span-3 text-sm font-medium text-muted-foreground">
                                {editingKeyFile?.dataFile?.shortName ?? 'N/A'} ({editingKeyFile?.dataFile?.longName ?? 'N/A'})
                            </div>
                        </div>
                        {/* Notes */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="editKeyFileNotes" className="text-right pt-2">Notes</Label>
                            <Textarea
                                id="editKeyFileNotes"
                                value={editKeyFileFormData.programFileNotes || ''}
                                onChange={(e) => handleEditKeyFileChange('programFileNotes', e.target.value)}
                                className="col-span-3 min-h-[80px]"
                                disabled={isSaving}
                                placeholder="Enter notes specific to using this file in this program..."
                            />
                        </div>
                        {/* Archive */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Archive</Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <Checkbox
                                    id="editKeyFileArchive"
                                    checked={!!editKeyFileFormData.archive}
                                    onCheckedChange={(checked) => handleEditKeyFileChange('archive', checked === true)}
                                    disabled={isSaving}
                                />
                                <Label htmlFor="editKeyFileArchive" className="font-normal cursor-pointer">Archive this key file link</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
                        <Button type="button" onClick={handleUpdateKeyFile} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* -------------------------- */}

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Program Management System</h1>
                <Button onClick={() => setShowCreateProgramDialog(true)} disabled={isSaving}>
                    <Plus className="mr-2 h-4 w-4" /> Create New Program
                </Button>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Program Explorer */}
                <div className="md:col-span-1 border rounded-md p-4 min-h-[400px]">
                    <h2 className="text-lg font-semibold mb-4">Programs</h2>
                    {isLoadingPrograms ? (
                        <div className="text-center p-4 text-muted-foreground"><Loader2 className="mx-auto h-8 w-8 animate-spin mb-2" /> Loading...</div>
                    ) : programs.length === 0 && !error ? (
                        <div className="text-center p-4 text-muted-foreground">
                            <FileCode className="mx-auto h-8 w-8 mb-2" />
                            <p>No programs created yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {programs.map((program) => (
                                <div key={program.id} className="space-y-1">
                                    {/* Program Row */}
                                    <div
                                        className={`flex items-center p-2 rounded-md cursor-pointer ${selectedProgram?.id === program.id ? "bg-muted" : "hover:bg-muted/50"}`}
                                        onClick={() => handleSelectProgram(program)}
                                    >
                                        <button
                                            className="mr-1 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                                            onClick={(e) => { e.stopPropagation(); toggleProgramExpansion(program.id); }}
                                            disabled={isLoadingDetails && selectedProgram?.id === program.id}
                                            title={expandedPrograms.includes(program.id) ? "Collapse" : "Expand"}
                                        >
                                            {expandedPrograms.includes(program.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </button>
                                        <span className="flex-1 truncate">{program.programName}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteProgram(program.id, program.programName); }}
                                            disabled={isSaving} title={`Delete ${program.programName}`}
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Expanded Section (Key Files / Notes Links) */}
                                    {expandedPrograms.includes(program.id) && (
                                        <div className="ml-6 space-y-1 border-l pl-2">
                                            {/* Key Files Link */}
                                            <div
                                                className={`flex items-center p-1 rounded-md cursor-pointer text-sm ${selectedSectionInSidebar === "keyFiles" && selectedProgram?.id === program.id ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"}`}
                                                onClick={(e) => { e.stopPropagation(); handleSelectSection(program, "keyFiles"); }}
                                            >
                                                <FileText className="h-3 w-3 mr-2 flex-shrink-0" />
                                                <span>Key Files</span>
                                                <Badge variant="secondary" className="ml-auto text-xs px-1.5">
                                                    {program._count?.keyFiles ?? 0}
                                                </Badge>
                                            </div>
                                            {/* Notes Link */}
                                            <div
                                                className={`flex items-center p-1 rounded-md cursor-pointer text-sm ${selectedSectionInSidebar === "notes" && selectedProgram?.id === program.id ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"}`}
                                                onClick={(e) => { e.stopPropagation(); handleSelectSection(program, "notes"); }}
                                            >
                                                <FileText className="h-3 w-3 mr-2 flex-shrink-0" />
                                                <span>Notes</span>
                                                <Badge variant="secondary" className="ml-auto text-xs px-1.5">
                                                    {program._count?.notes ?? 0}
                                                </Badge>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* --- Create DataFile Dialog (Added for Programs screen) --- */}
                <Dialog open={showCreateDataFileDialog} onOpenChange={setShowCreateDataFileDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New File Definition</DialogTitle>
                            <DialogDescription>
                                Define the metadata for a new file. It can then be selected as a key file.
                            </DialogDescription>
                        </DialogHeader>
                        {/* Display Error specific to this dialog */}
                        {createDataFileError && (<div className="my-2 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">{createDataFileError}</div>)}
                        {/* Form for creating DataFile */}
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="dialogShortName">Short Name <span className="text-red-500">*</span></Label>
                                    <Input id="dialogShortName" value={newDataFile.shortName} onChange={(e) => { setNewDataFile(prev => ({ ...prev, shortName: e.target.value })); if (createDataFileError) setCreateDataFileError(null); }} disabled={isCreatingDataFile} className={createDataFileError && !newDataFile.shortName ? "border-red-500" : ""} />
                                </div>
                                <div>
                                    <Label htmlFor="dialogLongName">Long Name <span className="text-red-500">*</span></Label>
                                    <Input id="dialogLongName" value={newDataFile.longName} onChange={(e) => { setNewDataFile(prev => ({ ...prev, longName: e.target.value })); if (createDataFileError) setCreateDataFileError(null); }} disabled={isCreatingDataFile} className={createDataFileError && !newDataFile.longName ? "border-red-500" : ""} />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="dialogFileLocation">File Location</Label>
                                <Input id="dialogFileLocation" value={newDataFile.fileLocation || ''} onChange={(e) => setNewDataFile(prev => ({ ...prev, fileLocation: e.target.value }))} disabled={isCreatingDataFile} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="dialogFileSize">File Size (bytes) <span className="text-red-500">*</span></Label>
                                    <Input id="dialogFileSize" type="number" min="0" value={newDataFile.fileSize} onChange={(e) => { setNewDataFile(prev => ({ ...prev, fileSize: Number.parseInt(e.target.value) || 0 })); if (createDataFileError) setCreateDataFileError(null); }} disabled={isCreatingDataFile} className={createDataFileError && newDataFile.fileSize < 0 ? "border-red-500" : ""} />
                                </div>
                                <div>
                                    <Label htmlFor="dialogDocLink">Document Link</Label>
                                    <Input id="dialogDocLink" value={newDataFile.docLink || ''} onChange={(e) => setNewDataFile(prev => ({ ...prev, docLink: e.target.value }))} disabled={isCreatingDataFile} />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox id="dialogArchive" checked={newDataFile.archive} onCheckedChange={(checked) => setNewDataFile(prev => ({ ...prev, archive: checked === true }))} disabled={isCreatingDataFile} />
                                <Label htmlFor="dialogArchive" className="cursor-pointer">Archive this file definition</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline" disabled={isCreatingDataFile}>Cancel</Button></DialogClose>
                            <Button onClick={handleCreateDataFile} disabled={isCreatingDataFile || !newDataFile.shortName || !newDataFile.longName || newDataFile.fileSize < 0}>
                                {isCreatingDataFile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Create File
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {/* ---------------------------------------------------------- */}
                {/* Details Panel */}
                <div className="md:col-span-3 border rounded-md p-4 min-h-[400px]">
                    {isLoadingDetails ? (
                        <div className="text-center p-8"><Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground mb-4" /><p>Loading details...</p></div>
                    ) : selectedProgram ? (
                        <div>
                            {/* Header & Edit Controls */}
                            <div className="flex justify-between items-center mb-4 pb-4 border-b">
                                <h2 className="text-xl font-semibold truncate pr-4">{getDisplayValue('programName')}</h2>
                                <div className="flex space-x-2 flex-shrink-0">
                                    <Button variant="outline" size="sm" onClick={handleEditToggle} disabled={isSaving}>
                                        {isEditMode ? <><Trash className="h-4 w-4 mr-1" /> Cancel</> : <><Edit className="h-4 w-4 mr-1" /> Edit</>}
                                    </Button>
                                    {isEditMode && (
                                        <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                                            Save Changes
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Tabs for Details */}
                            <Tabs value={activeTabInDetails} onValueChange={setActiveTabInDetails} className="mt-4">
                                <TabsList>
                                    <TabsTrigger value="details">Program Details</TabsTrigger>
                                    <TabsTrigger value="keyFiles">Key Files ({currentKeyFiles.length})</TabsTrigger>
                                    <TabsTrigger value="notes">Notes ({currentNotes.length})</TabsTrigger>
                                </TabsList>

                                {/* Details Tab Content */}
                                <TabsContent value="details" className="space-y-4 pt-4">
                                    {/* Program Name / Type */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Program Name</Label>
                                            {isEditMode ? (
                                                <Input value={getDisplayValue('programName') ?? ''} onChange={(e) => handleEditInputChange('programName', e.target.value)} disabled={isSaving} />
                                            ) : (
                                                <div className="p-2 border rounded-md min-h-[38px] bg-muted/30">{getDisplayValue('programName')}</div>
                                            )}
                                        </div>
                                        <div>
                                            <Label>Program Type</Label>
                                            {isEditMode ? (
                                                <Input value={getDisplayValue('programType') ?? ''} onChange={(e) => handleEditInputChange('programType', e.target.value)} disabled={isSaving} />
                                            ) : (
                                                <div className="p-2 border rounded-md min-h-[38px] bg-muted/30">{getDisplayValue('programType') || <i className="text-muted-foreground">N/A</i>}</div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Locations */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Running Location</Label>
                                            {isEditMode ? (
                                                <Input value={getDisplayValue('runningLocation') ?? ''} onChange={(e) => handleEditInputChange('runningLocation', e.target.value)} disabled={isSaving} />
                                            ) : (
                                                <div className="p-2 border rounded-md min-h-[38px] bg-muted/30">{getDisplayValue('runningLocation') || <i className="text-muted-foreground">N/A</i>}</div>
                                            )}
                                        </div>
                                        <div>
                                            <Label>Source Location</Label>
                                            {isEditMode ? (
                                                <Input value={getDisplayValue('sourceLocation') ?? ''} onChange={(e) => handleEditInputChange('sourceLocation', e.target.value)} disabled={isSaving} />
                                            ) : (
                                                <div className="p-2 border rounded-md min-h-[38px] bg-muted/30">{getDisplayValue('sourceLocation') || <i className="text-muted-foreground">N/A</i>}</div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Description */}
                                    <div>
                                        <Label>Program Description</Label>
                                        {isEditMode ? (
                                            <Textarea value={getDisplayValue('programDescription') ?? ''} onChange={(e) => handleEditInputChange('programDescription', e.target.value)} disabled={isSaving} />
                                        ) : (
                                            <div className="p-2 border rounded-md min-h-[80px] whitespace-pre-wrap bg-muted/30">{getDisplayValue('programDescription') || <i className="text-muted-foreground">N/A</i>}</div>
                                        )}
                                    </div>
                                    {/* Key Programmers */}
                                    <div>
                                        <Label>Key Programmers</Label>
                                        {isEditMode ? (
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[40px]">
                                                    {(editedProgramDetails.keyProgrammers ?? []).map((p, i) => (
                                                        <Badge key={i} variant="secondary" className="flex items-center gap-1">
                                                            {p}
                                                            <button onClick={() => handleRemovePerson("programmer", p)} className="ml-1 text-xs hover:text-destructive">×</button>
                                                        </Badge>
                                                    ))}
                                                    {(editedProgramDetails.keyProgrammers?.length ?? 0) === 0 && <span className="text-xs text-muted-foreground italic">None added</span>}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Input placeholder="Add programmer" value={programmerToAdd} onChange={e => setProgrammerToAdd(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPerson('programmer')} disabled={isSaving} />
                                                    <Button size="sm" onClick={() => handleAddPerson('programmer')} disabled={!programmerToAdd || isSaving}>Add</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-2 border rounded-md min-h-[40px]">
                                                {(selectedProgram.keyProgrammers ?? []).length > 0 ? selectedProgram.keyProgrammers.map((p, i) => <Badge key={i} variant="outline" className="mr-1 mb-1">{p}</Badge>) : <i className="text-muted-foreground">None specified</i>}
                                            </div>
                                        )}
                                    </div>
                                    {/* Key Users */}
                                    <div>
                                        <Label>Key Users</Label>
                                        {isEditMode ? (
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[40px]">
                                                    {(editedProgramDetails.keyUsers ?? []).map((u, i) => (
                                                        <Badge key={i} variant="secondary" className="flex items-center gap-1">
                                                            {u}
                                                            <button onClick={() => handleRemovePerson("user", u)} className="ml-1 text-xs hover:text-destructive">×</button>
                                                        </Badge>
                                                    ))}
                                                    {(editedProgramDetails.keyUsers?.length ?? 0) === 0 && <span className="text-xs text-muted-foreground italic">None added</span>}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Input placeholder="Add user/group" value={userToAdd} onChange={e => setUserToAdd(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPerson('user')} disabled={isSaving} />
                                                    <Button size="sm" onClick={() => handleAddPerson('user')} disabled={!userToAdd || isSaving}>Add</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-2 border rounded-md min-h-[40px]">
                                                {(selectedProgram.keyUsers ?? []).length > 0 ? selectedProgram.keyUsers.map((u, i) => <Badge key={i} variant="outline" className="mr-1 mb-1">{u}</Badge>) : <i className="text-muted-foreground">None specified</i>}
                                            </div>
                                        )}
                                    </div>
                                    {/* Archive Checkbox */}
                                    <div className="flex items-center space-x-2 pt-2">
                                        {isEditMode ? (
                                            <>
                                                <Checkbox id="archiveEdit" checked={!!getDisplayValue('archive')} onCheckedChange={(checked) => handleEditInputChange('archive', checked === true)} disabled={isSaving} />
                                                <Label htmlFor="archiveEdit" className="cursor-pointer">Archive this program definition</Label>
                                            </>
                                        ) : (
                                            <div className="p-2 border rounded-md bg-muted/30">Archived: {getDisplayValue('archive') ? "Yes" : "No"}</div>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground pt-2">
                                        Created: {new Date(selectedProgram.createdAt).toLocaleString()} | Updated: {new Date(selectedProgram.updatedAt).toLocaleString()}
                                    </div>
                                </TabsContent>

                                {/* Key Files Tab Content */}
                                <TabsContent value="keyFiles" className="pt-4">
                                    {currentKeyFiles.length > 0 ? (
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Seq</TableHead><TableHead>File</TableHead><TableHead>Notes</TableHead><TableHead>Created</TableHead><TableHead>Archive</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {currentKeyFiles.map((kf) => (
                                                    <TableRow key={kf.seqID}>
                                                        <TableCell>{kf.seqID}</TableCell>
                                                        <TableCell>{kf.dataFile?.shortName ?? <i className='text-muted-foreground'>ID: {kf.dataFileId}</i>}</TableCell>
                                                        <TableCell className="max-w-[200px] truncate">{kf.programFileNotes || '-'}</TableCell>
                                                        <TableCell>{new Date(kf.createdAt).toLocaleDateString()}</TableCell>
                                                        <TableCell>{kf.archive ? "Yes" : "No"}</TableCell>
                                                        <TableCell>
                                                            {/* --- UPDATED ACTIONS CELL --- */}
                                                            <div className="flex justify-center items-center gap-1"> {/* Flex container */}
                                                                {/* Edit Button (Add this) */}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-blue-600 hover:text-blue-800"
                                                                    onClick={(e) => { e.stopPropagation(); handleOpenEditKeyFileDialog(kf); }} // Open edit dialog
                                                                    disabled={isSaving}
                                                                    title={`Edit key file link (Seq ${kf.seqID})`}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                {/* Delete Button (Existing) */}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-red-600 hover:text-red-800"
                                                                    onClick={() => handleDeleteKeyFile(kf.programId, kf.seqID, kf.dataFile?.shortName)} // Keep existing delete
                                                                    disabled={isSaving}
                                                                    title={`Delete key file link (Seq ${kf.seqID})`}
                                                                >
                                                                    <Trash className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                            {/* -------------------------- */}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center p-4 text-muted-foreground border rounded-md my-4"><p>No key files added yet.</p></div>
                                    )}
                                    {/* Add Key File Form */}
                                    <div className="mt-6 space-y-4 border-t pt-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-medium">Add New Key File</h3>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setCreateDataFileError(null); // Clear previous errors
                                                    setShowCreateDataFileDialog(true); // Open the create dialog
                                                }}
                                                disabled={isSaving} // Disable if any save is in progress
                                            >
                                                <Plus className="mr-2 h-4 w-4" /> Create New File
                                            </Button>
                                        </div>
                                        {isLoadingDataFiles && <p className="text-sm text-muted-foreground">Loading file list...</p>}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end"> {/* Use items-end */}
                                            <div className="flex flex-col space-y-2">
                                                <Label htmlFor="dataFileId">File <span className="text-red-500">*</span></Label>
                                                <Select
                                                    value={newKeyFile.dataFileId}

                                                    onValueChange={(value) => setNewKeyFile(prev => ({ ...prev, dataFileId: value }))}
                                                    disabled={isSaving || isLoadingDataFiles || dataFilesForSelect.length === 0}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Select an existing file..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {dataFilesForSelect.map((file) => (<SelectItem key={file.id} value={file.id}>{file.shortName}</SelectItem>))}
                                                        {dataFilesForSelect.length === 0 && !isLoadingDataFiles && <SelectItem value="-" disabled>No data files available</SelectItem>}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                        </div>
                                        {/* Archive Checkbox */}
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="keyFileArchiveAdd" checked={newKeyFile.archive} onCheckedChange={(checked) => setNewKeyFile(prev => ({ ...prev, archive: checked === true }))} disabled={isSaving} />
                                            <Label htmlFor="keyFileArchiveAdd" className="cursor-pointer">Archive this link</Label>
                                        </div>
                                        {/* Notes Textarea */}
                                        <div>
                                            <Label htmlFor="keyFileNotesAdd">Notes for this file link</Label>
                                            <Textarea id="keyFileNotesAdd" value={newKeyFile.programFileNotes} onChange={(e) => setNewKeyFile(prev => ({ ...prev, programFileNotes: e.target.value }))} disabled={isSaving} />
                                        </div>
                                        {/* Add Key File Link Button */}
                                        <Button onClick={handleAddKeyFile} disabled={isSaving || !newKeyFile.dataFileId}>
                                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                            Add Key File Link
                                        </Button>
                                    </div>
                                </TabsContent>

                                {/* Notes Tab Content */}
                                <TabsContent value="notes" className="pt-4">
                                    {currentNotes.length > 0 ? (
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Seq</TableHead><TableHead>Note</TableHead><TableHead>User</TableHead><TableHead>Created</TableHead><TableHead>Archive</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {currentNotes.map((note) => (
                                                    <TableRow key={note.seqID}>
                                                        <TableCell>{note.seqID}</TableCell>
                                                        <TableCell className="max-w-[300px] whitespace-pre-wrap">{note.programNotes}</TableCell>
                                                        <TableCell>{note.user?.username || note.user?.name || <i className='text-muted-foreground'>ID: {note.userId}</i>}</TableCell>
                                                        <TableCell>{new Date(note.createdAt).toLocaleDateString()}</TableCell>
                                                        <TableCell>{note.archive ? "Yes" : "No"}</TableCell>
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteNote(note.programId, note.seqID)} disabled={isSaving}><Trash className="h-4 w-4" /></Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center p-4 text-muted-foreground border rounded-md my-4"><p>No notes added yet.</p></div>
                                    )}
                                    {/* Add Note Form */}
                                    <div className="mt-6 space-y-4 border-t pt-4">
                                        <h3 className="font-medium">Add New Note</h3>
                                        {/* User ID input removed - derived from auth token */}
                                        <div>
                                            <Label htmlFor="programNoteAdd">Note Content <span className="text-red-500">*</span></Label>
                                            <Textarea id="programNoteAdd" value={newNote.programNotes} onChange={(e) => setNewNote(prev => ({ ...prev, programNotes: e.target.value }))} disabled={isSaving} />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="noteArchiveAdd" checked={newNote.archive} onCheckedChange={(checked) => setNewNote(prev => ({ ...prev, archive: checked === true }))} disabled={isSaving} />
                                            <Label htmlFor="noteArchiveAdd" className="cursor-pointer">Archive this note</Label>
                                        </div>
                                        <Button onClick={handleAddNote} disabled={isSaving || !newNote.programNotes}>
                                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                            Add Note
                                        </Button>
                                    </div>
                                </TabsContent>

                            </Tabs>
                        </div>
                    ) : (
                        // No Program Selected View
                        <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                            <FileCode className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h2 className="text-lg font-medium mb-2">No program selected</h2>
                            {programs.length > 0 ? (
                                <p className="text-muted-foreground mb-4">Select a program from the list on the left.</p>
                            ) : (
                                <>
                                    <p className="text-muted-foreground mb-4">Create a new program definition to get started.</p>
                                    <Button onClick={() => setShowCreateProgramDialog(true)} disabled={isSaving}>
                                        <Plus className="mr-2 h-4 w-4" /> Create New Program
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Program Dialog */}
            <Dialog open={showCreateProgramDialog} onOpenChange={setShowCreateProgramDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Program Definition</DialogTitle>
                        <DialogDescription>Enter the details for the new program.</DialogDescription>
                    </DialogHeader>
                    {/* Simplified - No tabs needed in create */}
                    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Added scroll */}
                        {/* ... (Inputs for programName, programType, runningLocation, sourceLocation, programDescription - same as before) ... */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="createProgramName">Program Name <span className="text-red-500">*</span></Label>
                                <Input id="createProgramName" value={newProgram.programName} onChange={(e) => setNewProgram(prev => ({ ...prev, programName: e.target.value }))} disabled={isSaving} />
                            </div>
                            <div>
                                <Label htmlFor="createProgramType">Program Type</Label>
                                <Input id="createProgramType" value={newProgram.programType} onChange={(e) => setNewProgram(prev => ({ ...prev, programType: e.target.value }))} disabled={isSaving} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="createRunningLocation">Running Location</Label>
                                <Input id="createRunningLocation" value={newProgram.runningLocation} onChange={(e) => setNewProgram(prev => ({ ...prev, runningLocation: e.target.value }))} disabled={isSaving} />
                            </div>
                            <div>
                                <Label htmlFor="createSourceLocation">Source Location</Label>
                                <Input id="createSourceLocation" value={newProgram.sourceLocation} onChange={(e) => setNewProgram(prev => ({ ...prev, sourceLocation: e.target.value }))} disabled={isSaving} />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="createProgramDescription">Description</Label>
                            <Textarea id="createProgramDescription" value={newProgram.programDescription} onChange={(e) => setNewProgram(prev => ({ ...prev, programDescription: e.target.value }))} disabled={isSaving} />
                        </div>

                        {/* Use temporary comma-separated state for create dialog */}
                        <div>
                            <Label htmlFor="createKeyProgrammers">Key Programmers (comma-separated)</Label>
                            <Input id="createKeyProgrammers" value={newKeyProgrammersStr} onChange={(e) => setNewKeyProgrammersStr(e.target.value)} placeholder="John Doe, Jane Smith" disabled={isSaving} />
                        </div>
                        <div>
                            <Label htmlFor="createKeyUsers">Key Users (comma-separated)</Label>
                            <Input id="createKeyUsers" value={newKeyUsersStr} onChange={(e) => setNewKeyUsersStr(e.target.value)} placeholder="Marketing, Finance Dept" disabled={isSaving} />
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox id="createArchiveProgram" checked={newProgram.archive} onCheckedChange={(checked) => setNewProgram(prev => ({ ...prev, archive: checked === true }))} disabled={isSaving} />
                            <Label htmlFor="createArchiveProgram" className="cursor-pointer">Archive this program</Label>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 border-t pt-4">
                        <Button variant="outline" onClick={() => setShowCreateProgramDialog(false)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleCreateProgram} disabled={isSaving || !newProgram.programName}>
                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Create Program
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default Programs