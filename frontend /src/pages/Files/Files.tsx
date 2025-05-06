"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Trash,
    Edit,
    FileText,
    ChevronDown,
    ChevronRight,
    Save,
    Loader2,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { API_BASE_URL } from "@/apiRoute";
// import { toast } from "sonner"; // Optional

// --- API & Auth ---

const getAuthHeader = (): HeadersInit => {
    const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

async function apiRequest<T>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
        ...options.headers,
    };
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers,
        });
        if (!response.ok) {
            let errorData = { message: `HTTP error! status: ${response.status}` };
            try {
                errorData = await response.json();
            } catch (e) {
                /* ignore */
            }
            console.error("API Error:", errorData);
            throw new Error(errorData.message || response.statusText);
        }
        if (
            response.status === 204 ||
            response.headers.get("content-length") === "0"
        )
            return undefined as T;
        return (await response.json()) as T;
    } catch (error: any) {
        console.error("API Request Failed:", error);
        // toast.error(`Request Failed: ${error.message}`); // Optional feedback
        throw error;
    }
}

// --- Types --- (Assuming these match your backend/Prisma)
interface DataStructure {
    id: string;
    fileFieldID: string;
    dsID: number;
    dsBegPosition: number;
    dsEndPosition: number;
    dsName: string;
    dsDesc: string;
    archive: boolean;
}
interface ValidData {
    id: string;
    fileFieldID: string;
    seqID: number;
    validData: string;
    validDataDesc: string;
    archive: boolean;
}
interface DataField {
    fieldType: string;
    id: string;
    fileId: string;
    fieldName: string;
    description?: string | null;
    fieldSize: number;
    packed: boolean;
    begPosition: number;
    endPosition: number;
    validDataNotes?: string | null;
    archive: boolean;
    validData?: ValidData[];
    dataStructures?: DataStructure[];
}
export interface DataFile {
    id: string;
    shortName: string;
    longName: string;
    fileLocation?: string | null;
    fileSize: number;
    docLink?: string | null;
    archive: boolean;
    userId: string;
    createdAt: string;
    updatedAt: string;
    fields?: DataField[];
}
interface DataFileExplorer extends Omit<DataFile, "fields"> {
    _count?: { fields: number };
} // Include count for explorer indicator
const FIELD_TYPES = [
    { label: "CHARACTER", value: "CHARACTER" },
    { label: "NUMERIC", value: "NUMERIC" },
    { label: "DATE", value: "DATE" },
    { label: "DATETIME", value: "DATETIME" },
    { label: "BOOLEAN", value: "BOOLEAN" },
    { label: "PACKED_DECIMAL", value: "PACKED_DECIMAL" },
    { label: "FLOAT", value: "FLOAT" },
    { label: "DOUBLE", value: "DOUBLE" },
    { label: "INTEGER", value: "INTEGER" },
    { label: "LONG", value: "LONG" },
    { label: "SHORT", value: "SHORT" },
    { label: "BYTE", value: "BYTE" },
    { label: "STRING", value: "STRING" },
    { label: "TEXT", value: "TEXT" },
    { label: "BLOB", value: "BLOB" },
    { label: "CLOB", value: "CLOB" },
    { label: "OTHER", value: "OTHER" },
];

function Files() {
    // --- State ---
    const [files, setFiles] = useState<DataFileExplorer[]>([]);
    const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCreateFileDialog, setShowCreateFileDialog] = useState(false);
    const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedFileDetails, setEditedFileDetails] = useState<Partial<DataFile>>(
        {}
    );
    // --- State for Editing a Field ---
    const [editingField, setEditingField] = useState<DataField | null>(null); // Store the field being edited
    const [showEditFieldDialog, setShowEditFieldDialog] = useState(false);
    // Use a separate state for the edit form to avoid conflicts with 'newField'
    const [editFieldData, setEditFieldData] = useState<Partial<Omit<DataField, "id" | "fileId" | "begPosition" | "endPosition" | "validData" | "dataStructures">>>({});
    // --------------------------------------
    const [activeTabInDetails, setActiveTabInDetails] = useState("details");
    const [selectedFieldIdForValidData, setSelectedFieldIdForValidData] =
        useState<string | null>(null);
    const [newField, setNewField] = useState<
        Omit<
            DataField,
            | "id"
            | "fileId"
            | "begPosition"
            | "endPosition"
            | "validData"
            | "dataStructures"
        >
    >({
        fieldName: "",
        description: "",
        fieldType: "", // <-- ADD THIS (Initialize as empty or default)
        fieldSize: 0,
        packed: false,
        validDataNotes: "",
        archive: false,
    });

    // Form States
    const [newFile, setNewFile] = useState<
        Omit<DataFile, "id" | "userId" | "createdAt" | "updatedAt" | "fields">
    >({
        shortName: "",
        longName: "",
        fileLocation: "",
        fileSize: 0,
        docLink: "",
        archive: false,
    });
    const [newValidData, setNewValidData] = useState<
        Omit<ValidData, "id" | "fileFieldID" | "seqID">
    >({ validData: "", validDataDesc: "", archive: false });

    // --- NEW: State for Editing Valid Data ---
    const [editingValidData, setEditingValidData] = useState<ValidData | null>(null); // Store the ValidData item being edited
    const [showEditValidDataDialog, setShowEditValidDataDialog] = useState(false);
    // State for the edit form's data
    const [editValidDataFormData, setEditValidDataFormData] = useState<Partial<Omit<ValidData, "id" | "fileFieldID" | "seqID">>>({});
    // -----------------------------------------
    // --- Edit Field Handlers ---
    const handleOpenEditFieldDialog = (field: DataField) => {
        setEditingField(field);
        // Initialize edit form data with current field values
        setEditFieldData({
            fieldName: field.fieldName,
            description: field.description ?? "",
            fieldType: field.fieldType, // Make sure fieldType is fetched correctly
            fieldSize: field.fieldSize,
            packed: field.packed,
            validDataNotes: field.validDataNotes ?? "",
            archive: field.archive,
        });
        setShowEditFieldDialog(true);
    };

    const handleEditFieldChange = (field: keyof typeof editFieldData, value: string | number | boolean) => {
        setEditFieldData(prev => ({ ...prev, [field]: value }));
    };
    // --- Edit Valid Data Handlers ---
    const handleOpenEditValidDataDialog = (validDataItem: ValidData) => {
        setEditingValidData(validDataItem);
        // Pre-fill the edit form
        setEditValidDataFormData({
            validData: validDataItem.validData,
            validDataDesc: validDataItem.validDataDesc,
            archive: validDataItem.archive,
        });
        setShowEditValidDataDialog(true);
    };

    const handleEditValidDataChange = (field: keyof typeof editValidDataFormData, value: string | boolean) => {
        setEditValidDataFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleUpdateValidData = async () => {
        if (!editingValidData || !selectedFile || !selectedFieldIdForValidData) return;
        // Basic validation for the edit form
        if (!editValidDataFormData.validData?.trim() || !editValidDataFormData.validDataDesc?.trim()) {
            setError("Valid Data value and Description cannot be empty.");
            return;
        }

        setIsSaving(true); setError(null);
        const url = `/datafiles/${selectedFile.id}/fields/${selectedFieldIdForValidData}/validdata/${editingValidData.id}`;
        const dto: Partial<typeof editValidDataFormData> = { ...editValidDataFormData }; // Send only changed fields

        try {
            await apiRequest<ValidData>(url, { method: 'PATCH', body: JSON.stringify(dto) });
            setShowEditValidDataDialog(false); // Close dialog
            setEditingValidData(null);         // Clear editing state
            setEditValidDataFormData({});      // Clear form data
            await fetchFileDetails(selectedFile.id); // Refresh details
            setActiveTabInDetails("validData"); // Stay on tab
            // toast.success("Valid data updated."); // Optional
        } catch (err: any) {
            setError(err.message || "Failed to update valid data.");
            // Keep dialog open on error
        } finally {
            setIsSaving(false);
        }
    };
    // -------------------------------

    const handleUpdateField = async () => {
        if (!editingField || !selectedFile) return;
        // Add validation for required fields in edit form if necessary
        if (!editFieldData.fieldName || !editFieldData.fieldType || (editFieldData.fieldSize ?? 0) < 1) {
            setError("Field Name, Field Type, and Size >= 1 are required for update.");
            return;
        }

        setIsSaving(true); setError(null);
        const url = `/datafiles/${selectedFile.id}/fields/${editingField.id}`;
        // Prepare DTO - only send fields that are part of editFieldData
        const dto: Partial<typeof editFieldData> = { ...editFieldData };

        try {
            await apiRequest<DataField>(url, { method: 'PATCH', body: JSON.stringify(dto) });
            setShowEditFieldDialog(false); // Close dialog on success
            setEditingField(null);         // Clear editing state
            setEditFieldData({});          // Clear form data
            await fetchFileDetails(selectedFile.id); // Refresh details
            setActiveTabInDetails("fields"); // Stay on fields tab
            // toast.success("Field updated."); // Optional
        } catch (err: any) {
            setError(err.message || "Failed to update field.");
            // Keep dialog open on error? Or close? Current: Keeps open
        } finally {
            setIsSaving(false);
        }
    };
    // --------------------------


    // --- Data Fetching ---
    const fetchFiles = useCallback(async () => {
        setIsLoadingFiles(true);
        setError(null);
        try {
            const data = await apiRequest<DataFileExplorer[]>("/datafiles");
            setFiles(data);
        } catch (err: any) {
            setError(err.message || "Failed to fetch files.");
            setFiles([]);
        } finally {
            setIsLoadingFiles(false);
        }
    }, []);

    const fetchFileDetails = useCallback(async (fileId: string) => {
        setIsLoadingDetails(true);
        setError(null);
        setSelectedFile(null);
        try {
            const data = await apiRequest<DataFile>(`/datafiles/${fileId}`);
            setSelectedFile(data);
            setEditedFileDetails({});
            setIsEditMode(false);
            setSelectedFieldIdForValidData(null);
            setActiveTabInDetails("details"); // Always default to details on new selection
        } catch (err: any) {
            setError(err.message || `Failed to fetch file ${fileId}.`);
            setSelectedFile(null);
        } finally {
            setIsLoadingDetails(false);
        }
    }, []);
    const handleSelectFieldForValidData = (fieldId: string | null) => {
        // Log to confirm it's being called
        console.log("Selecting field for Valid Data:", fieldId);
        setSelectedFieldIdForValidData(fieldId);
        // Reset new valid data form when field changes
        setNewValidData({ validData: "", validDataDesc: "", archive: false });
    };

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // --- Event Handlers ---
    const handleSelectFile = (file: DataFileExplorer) => {
        if (selectedFile?.id === file.id && !isLoadingDetails) {
            toggleFileExpansion(file.id);
            return;
        }
        fetchFileDetails(file.id);
        setExpandedFileId(file.id);
        setActiveTabInDetails("details");
    };

    const toggleFileExpansion = (fileId: string) => {
        setExpandedFileId((prev) => (prev === fileId ? null : fileId));
    };

    const handleCreateFile = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const createdFile = await apiRequest<DataFile>("/datafiles", {
                method: "POST",
                body: JSON.stringify(newFile),
            });
            setShowCreateFileDialog(false);
            setNewFile({
                shortName: "",
                longName: "",
                fileLocation: "",
                fileSize: 0,
                docLink: "",
                archive: false,
            });
            await fetchFiles();
            handleSelectFile(createdFile);
        } catch (err: any) {
            setError(err.message || "Failed to create file.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddField = async () => {
        if (!selectedFile || !newField.fieldName || newField.fieldSize < 1) {
            setError("Field Name and a Size >= 1 are required.");
            return;
        }
        setIsSaving(true);
        setError(null);
        try {
            await apiRequest<DataField>(`/datafiles/${selectedFile.id}/fields`, {
                method: "POST",
                body: JSON.stringify(newField),
            });
            setNewField({
                fieldName: "",
                description: "",
                fieldType: "",
                fieldSize: 0,
                packed: false,
                validDataNotes: "",
                archive: false,
            });
            await fetchFileDetails(selectedFile.id); // Refresh details
            setActiveTabInDetails("fields"); // Switch to fields tab
        } catch (err: any) {
            setError(err.message || "Failed to add field.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddValidData = async () => {
        if (
            !selectedFile ||
            !selectedFieldIdForValidData ||
            !newValidData.validData ||
            !newValidData.validDataDesc
        ) {
            setError("Valid Data value and description required.");
            return;
        }
        setIsSaving(true);
        setError(null);
        try {
            await apiRequest<ValidData>(
                `/datafiles/${selectedFile.id}/fields/${selectedFieldIdForValidData}/validdata`,
                { method: "POST", body: JSON.stringify(newValidData) }
            );
            setNewValidData({ validData: "", validDataDesc: "", archive: false });
            await fetchFileDetails(selectedFile.id); // Refresh
            setActiveTabInDetails("validData"); // Stay on tab
        } catch (err: any) {
            setError(err.message || "Failed to add valid data.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteFile = async (fileId: string, fileName: string) => {
        if (!window.confirm(`Delete file "${fileName}" and ALL related data?`))
            return;
        setIsSaving(true);
        setError(null);
        try {
            await apiRequest(`/datafiles/${fileId}`, { method: "DELETE" });
            if (selectedFile?.id === fileId) setSelectedFile(null);
            if (expandedFileId === fileId) setExpandedFileId(null);
            await fetchFiles();
        } catch (err: any) {
            setError(err.message || "Failed to delete file.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteField = async (fieldId: string, fieldName: string) => {
        if (!selectedFile) return;
        if (!window.confirm(`Delete field "${fieldName}" and related data?`))
            return;
        setIsSaving(true);
        setError(null);
        try {
            await apiRequest(`/datafiles/${selectedFile.id}/fields/${fieldId}`, {
                method: "DELETE",
            });
            if (selectedFieldIdForValidData === fieldId)
                setSelectedFieldIdForValidData(null); // Reset if selected field deleted
            await fetchFileDetails(selectedFile.id);
        } catch (err: any) {
            setError(err.message || "Failed to delete field.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteValidData = async (
        validDataId: string,
        validDataValue: string
    ) => {
        if (!selectedFile || !selectedFieldIdForValidData) return;
        if (!window.confirm(`Delete valid data "${validDataValue}"?`)) return;
        setIsSaving(true);
        setError(null);
        try {
            await apiRequest(
                `/datafiles/${selectedFile.id}/fields/${selectedFieldIdForValidData}/validdata/${validDataId}`,
                { method: "DELETE" }
            );
            await fetchFileDetails(selectedFile.id);
        } catch (err: any) {
            setError(err.message || "Failed to delete valid data.");
        } finally {
            setIsSaving(false);
        }
    };

    // Edit Mode Handlers
    const handleEditToggle = () => {
        if (isEditMode) {
            setIsEditMode(false);
            setEditedFileDetails({});
        } else {
            if (!selectedFile) return;
            setEditedFileDetails({
                shortName: selectedFile.shortName,
                longName: selectedFile.longName,
                fileLocation: selectedFile.fileLocation,
                fileSize: selectedFile.fileSize,
                docLink: selectedFile.docLink,
                archive: selectedFile.archive,
            });
            setIsEditMode(true);
        }
    };
    const handleEditInputChange = (
        field: keyof DataFile,
        value: string | number | boolean
    ) => {
        setEditedFileDetails((prev) => ({ ...prev, [field]: value }));
    };
    const handleSaveChanges = async () => {
        if (!selectedFile || !isEditMode) return;
        setIsSaving(true);
        setError(null);
        try {
            const updatedFile = await apiRequest<DataFile>(
                `/datafiles/${selectedFile.id}`,
                { method: "PATCH", body: JSON.stringify(editedFileDetails) }
            );
            setSelectedFile(updatedFile);
            setIsEditMode(false);
            setEditedFileDetails({});
            await fetchFiles();
        } catch (err: any) {
            setError(err.message || "Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    // Derived state
    const currentFields = selectedFile?.fields ?? [];
    const selectedFieldObject = currentFields.find(
        (f) => f.id === selectedFieldIdForValidData
    );
    const getValidDataForField = (fieldId: string): ValidData[] =>
        currentFields.find((f) => f.id === fieldId)?.validData ?? [];
    const getDisplayValue = (field: keyof DataFile) =>
        isEditMode && editedFileDetails[field] !== undefined
            ? editedFileDetails[field]
            : selectedFile?.[field];

    // --- Render ---
    return (
        <div className="container mx-auto p-4">
            {/* ... Global Loading/Saving Indicator ... */}
            {(isLoadingFiles || isLoadingDetails || isSaving) && (
                <div className="fixed top-4 right-4 z-50 p-2 bg-blue-100 text-blue-700 rounded shadow flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                    <span>{isSaving ? "Saving..." : "Loading..."}</span>
                </div>
            )}
            {/* --- Edit Valid Data Dialog --- */}
            <Dialog open={showEditValidDataDialog} onOpenChange={setShowEditValidDataDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Valid Data (Seq: {editingValidData?.seqID})</DialogTitle>
                        <DialogDescription>Update the value and description for this valid data entry.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Valid Data Value */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="editValidDataValue" className="text-right">Value <span className="text-red-500">*</span></Label>
                            <Input id="editValidDataValue" value={editValidDataFormData.validData || ''} onChange={(e) => handleEditValidDataChange('validData', e.target.value)} className="col-span-3 font-mono" disabled={isSaving} />
                        </div>
                        {/* Description */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="editValidDataDesc" className="text-right">Description <span className="text-red-500">*</span></Label>
                            <Input id="editValidDataDesc" value={editValidDataFormData.validDataDesc || ''} onChange={(e) => handleEditValidDataChange('validDataDesc', e.target.value)} className="col-span-3" disabled={isSaving} />
                        </div>
                        {/* Archive */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Archive</Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <Checkbox id="editValidDataArchive" checked={!!editValidDataFormData.archive} onCheckedChange={(checked) => handleEditValidDataChange('archive', checked === true)} disabled={isSaving} />
                                <Label htmlFor="editValidDataArchive" className="font-normal cursor-pointer">Archive this entry</Label>
                            </div>
                        </div>
                        {/* Error Display */}
                        {error && isSaving && (
                            <div className="col-span-4 text-sm text-red-600">{error}</div>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
                        <Button type="button" onClick={handleUpdateValidData} disabled={isSaving || !editValidDataFormData.validData || !editValidDataFormData.validDataDesc}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* -------------------------- */}
            {/* --- Edit Field Dialog --- */}
            <Dialog open={showEditFieldDialog} onOpenChange={setShowEditFieldDialog}>
                <DialogContent className="sm:max-w-[600px]"> {/* Wider dialog maybe */}
                    <DialogHeader>
                        <DialogTitle>Edit Field: {editingField?.fieldName}</DialogTitle>
                        <DialogDescription>Make changes to the field properties below.</DialogDescription>
                    </DialogHeader>
                    {/* Use a form structure similar to Add New Field, but bind to editFieldData */}
                    <div className="grid gap-4 py-4">
                        {/* Field Name */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="editFieldName" className="text-right">Name <span className="text-red-500">*</span></Label>
                            <Input id="editFieldName" value={editFieldData.fieldName || ''} onChange={(e) => handleEditFieldChange('fieldName', e.target.value)} className="col-span-3" disabled={isSaving} />
                        </div>
                        {/* Field Size */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="editFieldSize" className="text-right">Size <span className="text-red-500">*</span></Label>
                            <Input id="editFieldSize" type="number" min="1" value={editFieldData.fieldSize || ''} onChange={(e) => handleEditFieldChange('fieldSize', Number(e.target.value) || 0)} className="col-span-3" disabled={isSaving} />
                        </div>
                        {/* Field Type */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="editFieldType" className="text-right">Type <span className="text-red-500">*</span></Label>
                            <Select value={editFieldData.fieldType} onValueChange={(value) => handleEditFieldChange('fieldType', value as FieldTypeString)} disabled={isSaving}>
                                <SelectTrigger id="editFieldType" className="col-span-3"> <SelectValue placeholder="Select data type..." /> </SelectTrigger>
                                <SelectContent> {FIELD_TYPES.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))} </SelectContent>
                            </Select>
                        </div>
                        {/* Description */}
                        <div className="grid grid-cols-4 items-start gap-4"> {/* Changed items-center to items-start for textarea */}
                            <Label htmlFor="editDescription" className="text-right pt-2">Description</Label>
                            <Textarea id="editDescription" value={editFieldData.description || ''} onChange={(e) => handleEditFieldChange('description', e.target.value)} className="col-span-3" disabled={isSaving} />
                        </div>
                        {/* Valid Data Notes */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="editValidDataNotes" className="text-right pt-2">Valid Data Notes</Label>
                            <Textarea id="editValidDataNotes" value={editFieldData.validDataNotes || ''} onChange={(e) => handleEditFieldChange('validDataNotes', e.target.value)} className="col-span-3" disabled={isSaving} />
                        </div>
                        {/* Packed / Archive Checkboxes */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Options</Label>
                            <div className="col-span-3 flex items-center space-x-6"> {/* Spaced checkboxes */}
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="editPacked" checked={!!editFieldData.packed} onCheckedChange={(checked) => handleEditFieldChange('packed', checked === true)} disabled={isSaving} />
                                    <Label htmlFor="editPacked" className="font-normal cursor-pointer">Packed</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="editArchive" checked={!!editFieldData.archive} onCheckedChange={(checked) => handleEditFieldChange('archive', checked === true)} disabled={isSaving} />
                                    <Label htmlFor="editArchive" className="font-normal cursor-pointer">Archive</Label>
                                </div>
                            </div>
                        </div>
                        {/* Display Position (Readonly in this dialog) */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Position</Label>
                            <div className="col-span-3 text-sm text-muted-foreground">{editingField?.begPosition}-{editingField?.endPosition}</div>
                        </div>
                        {/* Display Error specific to this dialog */}
                        {error && isSaving && (
                            <div className="col-span-4 text-sm text-red-600">{error}</div>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
                        <Button type="button" onClick={handleUpdateField} disabled={isSaving || !editFieldData.fieldName || !editFieldData.fieldType || (editFieldData.fieldSize ?? 0) < 1}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* -------------------------- */}

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">File Management System</h1>
                <Button
                    onClick={() => setShowCreateFileDialog(true)}
                    disabled={isSaving}
                >
                    {" "}
                    <Plus className="mr-2 h-4 w-4" /> Create New File{" "}
                </Button>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* File Explorer (Left Panel) */}
                <div className="md:col-span-1 border rounded-md p-4 min-h-[300px]">
                    <h2 className="text-lg font-semibold mb-4">Files</h2>
                    {/* ... Loading/Empty/Error States for File List ... */}
                    {isLoadingFiles && (
                        <div className="text-center p-4">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin mb-2" />{" "}
                            Loading...
                        </div>
                    )}
                    {!isLoadingFiles && files.length === 0 && !error && (
                        <div className="text-center p-4 text-muted-foreground">
                            <FileText className="mx-auto h-8 w-8 mb-2" />
                            <p>No files created.</p>
                        </div>
                    )}
                    {!isLoadingFiles && error && (
                        <div className="text-red-600 p-4">{error}</div>
                    )}
                    {!isLoadingFiles && files.length > 0 && (
                        <div className="space-y-1">
                            {files.map((file) => (
                                <div key={file.id}>
                                    {/* File Item Row */}
                                    <div
                                        className={`flex items-center p-1.5 rounded-md cursor-pointer ${selectedFile?.id === file.id
                                            ? "bg-muted"
                                            : "hover:bg-muted/50"
                                            }`}
                                        onClick={() => handleSelectFile(file)}
                                    >
                                        {/* Expand Button */}
                                        <button
                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-50 mr-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFileExpansion(file.id);
                                            }}
                                            disabled={
                                                isLoadingDetails && selectedFile?.id === file.id
                                            }
                                            title={expandedFileId === file.id ? "Collapse" : "Expand"}
                                        >
                                            {expandedFileId === file.id ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>
                                        {/* File Name */}
                                        <span className="flex-1 truncate text-sm">
                                            {file.shortName}
                                        </span>
                                        {/* Delete Button */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFile(file.id, file.shortName);
                                            }}
                                            disabled={isSaving}
                                            title={`Delete ${file.shortName}`}
                                        >
                                            {" "}
                                            <Trash className="h-3 w-3" />{" "}
                                        </Button>
                                    </div>
                                    {/* Expanded Section - Field List (No Form Here) */}
                                    {expandedFileId === file.id &&
                                        selectedFile?.id === file.id && (
                                            <div className="ml-5 pl-3 border-l space-y-0.5 py-1">
                                                {currentFields.length === 0 && (
                                                    <p className="text-xs text-muted-foreground italic px-1">
                                                        No fields defined
                                                    </p>
                                                )}
                                                {currentFields.map((field) => (
                                                    <div
                                                        key={field.id}
                                                        className={`flex items-center p-1 rounded-md cursor-pointer text-xs truncate ${selectedFieldIdForValidData === field.id
                                                            ? "bg-accent text-accent-foreground"
                                                            : "hover:bg-muted/50"
                                                            }`}
                                                        // *Clicking field in explorer now also selects it for Valid Data tab*
                                                        onClick={() => {
                                                            setActiveTabInDetails("validData");
                                                            handleSelectFieldForValidData(field.id);
                                                        }}
                                                        title={field.fieldName}
                                                    >
                                                        <span className="flex-1 truncate">
                                                            {field.fieldName}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details Panel (Right Panel) */}
                <div className="md:col-span-3 border rounded-md p-4 min-h-[300px]">
                    {isLoadingDetails && (
                        <div className="text-center p-8">
                            <Loader2 className="mx-auto h-12 w-12 animate-spin mb-4" />
                            <p>Loading details...</p>
                        </div>
                    )}
                    {!isLoadingDetails && error && !selectedFile && (
                        <div className="text-red-600 p-4">{error}</div>
                    )}{" "}
                    {/* Show error if details fail */}
                    {!isLoadingDetails && selectedFile && (
                        <div>
                            {/* Header & Edit Controls */}
                            <div className="flex justify-between items-center mb-4 pb-4 border-b">
                                <h2
                                    className="text-xl font-semibold truncate pr-4"
                                    title={`${getDisplayValue("longName") || ""} (${getDisplayValue("shortName") || ""
                                        })`}
                                >
                                    {getDisplayValue("shortName")}
                                    <span className="text-base font-normal text-muted-foreground ml-2">
                                        ({getDisplayValue("longName")})
                                    </span>
                                </h2>
                                <div className="flex space-x-2 flex-shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleEditToggle}
                                        disabled={isSaving}
                                    >
                                        {isEditMode ? (
                                            <>
                                                <Trash className="h-4 w-4 mr-1" /> Cancel
                                            </>
                                        ) : (
                                            <>
                                                <Edit className="h-4 w-4 mr-1" /> Edit
                                            </>
                                        )}
                                    </Button>
                                    {isEditMode && (
                                        <Button
                                            size="sm"
                                            onClick={handleSaveChanges}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4 mr-1" />
                                            )}{" "}
                                            Save Changes
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {/* Action Error Display */}
                            {error && !isSaving && (
                                <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">
                                    {error}
                                </div>
                            )}{" "}
                            {/* Show non-saving errors */}
                            {error && isSaving && (
                                <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">
                                    {error}
                                </div>
                            )}{" "}
                            {/* Show saving errors */}
                            {/* Tabs */}
                            <Tabs
                                value={activeTabInDetails}
                                onValueChange={setActiveTabInDetails}
                                className="mt-4"
                            >
                                <TabsList>
                                    <TabsTrigger value="details">File Details</TabsTrigger>
                                    <TabsTrigger value="fields">
                                        Fields ({currentFields.length})
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="validData"
                                        disabled={!selectedFieldIdForValidData}
                                    >
                                        Valid Data{" "}
                                        {selectedFieldObject
                                            ? `(${selectedFieldObject.fieldName})`
                                            : ""}
                                    </TabsTrigger>
                                </TabsList>

                                {/* File Details Tab Content */}
                                <TabsContent value="details" className="space-y-4 pt-4">
                                    {/* ... File Detail fields JSX remains the same ... */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Short Name</Label>
                                            {isEditMode ? (
                                                <Input
                                                    value={getDisplayValue("shortName") as string}
                                                    onChange={(e) =>
                                                        handleEditInputChange("shortName", e.target.value)
                                                    }
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                <div className="p-2 border rounded-md min-h-[38px] bg-muted/30">
                                                    {getDisplayValue("shortName")}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <Label>Long Name</Label>
                                            {isEditMode ? (
                                                <Input
                                                    value={getDisplayValue("longName") as string}
                                                    onChange={(e) =>
                                                        handleEditInputChange("longName", e.target.value)
                                                    }
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                <div className="p-2 border rounded-md min-h-[38px] bg-muted/30">
                                                    {getDisplayValue("longName")}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <Label>File Location</Label>
                                        {isEditMode ? (
                                            <Input
                                                value={
                                                    (getDisplayValue("fileLocation") as string) ?? ""
                                                }
                                                onChange={(e) =>
                                                    handleEditInputChange("fileLocation", e.target.value)
                                                }
                                                disabled={isSaving}
                                            />
                                        ) : (
                                            <div className="p-2 border rounded-md min-h-[38px] bg-muted/30">
                                                {getDisplayValue("fileLocation") || (
                                                    <span className="text-muted-foreground italic">
                                                        N/A
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>File Size (bytes)</Label>
                                            {isEditMode ? (
                                                <Input
                                                    type="number"
                                                    value={getDisplayValue("fileSize") as number}
                                                    onChange={(e) =>
                                                        handleEditInputChange(
                                                            "fileSize",
                                                            Number(e.target.value) || 0
                                                        )
                                                    }
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                <div className="p-2 border rounded-md min-h-[38px] bg-muted/30">
                                                    {getDisplayValue("fileSize")}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <Label>Document Link</Label>
                                            {isEditMode ? (
                                                <Input
                                                    value={(getDisplayValue("docLink") as string) ?? ""}
                                                    onChange={(e) =>
                                                        handleEditInputChange("docLink", e.target.value)
                                                    }
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                <div className="p-2 border rounded-md min-h-[38px] bg-muted/30">
                                                    {getDisplayValue("docLink") || (
                                                        <span className="text-muted-foreground italic">
                                                            N/A
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 pt-2">
                                        {isEditMode ? (
                                            <>
                                                <Checkbox
                                                    id="archiveEdit"
                                                    checked={!!getDisplayValue("archive")}
                                                    onCheckedChange={(checked) =>
                                                        handleEditInputChange("archive", checked === true)
                                                    }
                                                    disabled={isSaving}
                                                />
                                                <Label htmlFor="archiveEdit" className="cursor-pointer">
                                                    Archive
                                                </Label>
                                            </>
                                        ) : (
                                            <div className="p-2 border rounded-md bg-muted/30">
                                                Archived: {getDisplayValue("archive") ? "Yes" : "No"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground pt-2">
                                        Created: {new Date(selectedFile.createdAt).toLocaleString()}{" "}
                                        | Updated:{" "}
                                        {new Date(selectedFile.updatedAt).toLocaleString()}
                                    </div>
                                </TabsContent>

                                {/* Fields Tab Content - Including Add Form */}
                                <TabsContent value="fields" className="pt-4 space-y-6">
                                    {/* Existing Fields Table */}
                                    <div>
                                        <h3 className="text-md font-semibold mb-2">
                                            Existing Fields
                                        </h3>
                                        {currentFields.length > 0 ? (
                                            <div className="overflow-x-auto border rounded-md">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            {/* === REORDERED HEADERS & ADDED TYPE === */}
                                                            <TableHead>Name</TableHead>
                                                            <TableHead className="text-right">Size</TableHead>
                                                            <TableHead className="text-right">
                                                                Position
                                                            </TableHead>
                                                            <TableHead>Type</TableHead> {/* Added */}
                                                            <TableHead>Description</TableHead>
                                                            <TableHead>Packed</TableHead>
                                                            <TableHead>Archive</TableHead>
                                                            <TableHead className="w-[50px]"></TableHead>
                                                            {/* Action */}
                                                            {/* ===================================== */}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {currentFields.map((field) => (
                                                            <TableRow
                                                                key={field.id}
                                                                className={
                                                                    selectedFieldIdForValidData === field.id
                                                                        ? "bg-accent"
                                                                        : "hover:bg-muted/50"
                                                                }
                                                                onClick={() =>
                                                                    handleSelectFieldForValidData(field.id)
                                                                } // Selects field for Valid Data tab
                                                                style={{ cursor: "pointer" }}
                                                            >

                                                                {/* === REORDERED CELLS & ADDED TYPE === */}
                                                                <TableCell className="font-medium">
                                                                    {field.fieldName}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {field.fieldSize}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {field.begPosition}-{field.endPosition}
                                                                </TableCell>
                                                                <TableCell>{field.fieldType}</TableCell>{" "}
                                                                {/* Display fieldType */}
                                                                <TableCell
                                                                    className="text-sm text-muted-foreground max-w-[200px] truncate"
                                                                    title={field.description || ""}
                                                                >
                                                                    {field.description || "-"}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {field.packed ? "Yes" : "No"}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {field.archive ? "Yes" : "No"}
                                                                </TableCell>
                                                                <TableCell className="text-center"> {/* Centered Actions */}
                                                                    <div className="flex justify-center items-center gap-1"> {/* Flex container */}
                                                                        {/* --- EDIT BUTTON (ADD THIS) --- */}
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-blue-600 hover:text-blue-800"
                                                                            onClick={(e) => { e.stopPropagation(); handleOpenEditFieldDialog(field); }}
                                                                            disabled={isSaving}
                                                                            title={`Edit field ${field.fieldName}`}
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                        {/* --- DELETE BUTTON (Existing) --- */}
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-red-600 hover:text-red-800"
                                                                            onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id, field.fieldName); }}
                                                                            disabled={isSaving}
                                                                            title={`Delete field ${field.fieldName}`}
                                                                        >
                                                                            <Trash className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                                {/* ==================================== */}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <div className="text-center p-4 text-muted-foreground border rounded-md">
                                                <p>No fields added to this file yet.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Add New Field Form */}
                                    <div className="border-t pt-6 space-y-4">
                                        <h3 className="text-lg font-semibold">Add New Field</h3>
                                        {/* Field Name / Size */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="detailFieldName">
                                                    Field Name <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="detailFieldName"
                                                    placeholder="e.g., CUSTOMER_ID"
                                                    value={newField.fieldName}
                                                    onChange={(e) =>
                                                        setNewField((prev) => ({
                                                            ...prev,
                                                            fieldName: e.target.value,
                                                        }))
                                                    }
                                                    disabled={isSaving}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="detailFieldSize">
                                                    Field Size <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="detailFieldSize"
                                                    placeholder="e.g., 10"
                                                    type="number"
                                                    min="1"
                                                    value={newField.fieldSize || ""}
                                                    onChange={(e) =>
                                                        setNewField((prev) => ({
                                                            ...prev,
                                                            fieldSize: Number(e.target.value) || 0,
                                                        }))
                                                    }
                                                    disabled={isSaving}
                                                />
                                            </div>
                                        </div>
                                        {/* --- ADDED FIELD TYPE SELECT --- */}
                                        <div>
                                            <Label htmlFor="detailFieldType">
                                                Field Type <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={newField.fieldType}
                                                onValueChange={(value) =>
                                                    setNewField((prev) => ({
                                                        ...prev,
                                                        fieldType: value as FieldTypeString,
                                                    }))
                                                } // Ensure type safety if possible
                                                disabled={isSaving}
                                            >
                                                <SelectTrigger id="detailFieldType">
                                                    <SelectValue placeholder="Select data type..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {FIELD_TYPES.map(
                                                        (
                                                            type // Make sure FIELD_TYPES is defined
                                                        ) => (
                                                            <SelectItem key={type.value} value={type.value}>
                                                                {type.label}
                                                            </SelectItem>
                                                        )
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* ----------------------------- */}
                                        {/* Description */}
                                        <div>
                                            <Label htmlFor="detailDescription">Description</Label>
                                            <Textarea
                                                id="detailDescription"
                                                placeholder="Optional: What this field represents"
                                                value={newField.description}
                                                onChange={(e) =>
                                                    setNewField((prev) => ({
                                                        ...prev,
                                                        description: e.target.value,
                                                    }))
                                                }
                                                disabled={isSaving}
                                            />
                                        </div>
                                        {/* Valid Data Notes */}
                                        <div>
                                            <Label htmlFor="detailValidDataNotes">
                                                Valid Data Notes
                                            </Label>
                                            <Textarea
                                                id="detailValidDataNotes"
                                                placeholder="Optional: Notes about valid values"
                                                value={newField.validDataNotes}
                                                onChange={(e) =>
                                                    setNewField((prev) => ({
                                                        ...prev,
                                                        validDataNotes: e.target.value,
                                                    }))
                                                }
                                                disabled={isSaving}
                                            />
                                        </div>
                                        {/* Checkboxes */}
                                        <div className="flex items-center space-x-8">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="detailPacked"
                                                    checked={newField.packed}
                                                    onCheckedChange={(checked) =>
                                                        setNewField((prev) => ({
                                                            ...prev,
                                                            packed: checked === true,
                                                        }))
                                                    }
                                                    disabled={isSaving}
                                                />
                                                <Label
                                                    htmlFor="detailPacked"
                                                    className="cursor-pointer"
                                                >
                                                    Packed
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="detailArchive"
                                                    checked={newField.archive}
                                                    onCheckedChange={(checked) =>
                                                        setNewField((prev) => ({
                                                            ...prev,
                                                            archive: checked === true,
                                                        }))
                                                    }
                                                    disabled={isSaving}
                                                />
                                                <Label
                                                    htmlFor="detailArchive"
                                                    className="cursor-pointer"
                                                >
                                                    Archive
                                                </Label>
                                            </div>
                                        </div>
                                        {/* Submit Button */}
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={handleAddField}
                                                disabled={
                                                    isSaving ||
                                                    !newField.fieldName ||
                                                    !newField.fieldType ||
                                                    newField.fieldSize < 1
                                                }
                                            >
                                                {" "}
                                                {/* Added !newField.fieldType check */}
                                                {isSaving ? (
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Plus className="mr-2 h-4 w-4" />
                                                )}
                                                Add Field
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>


                                <TabsContent value="validData">
                                    {(() => {
                                        // Use an IIFE for logging within JSX
                                        // --- DEBUGGING LOGS ---
                                        console.log("Rendering Valid Data Tab Content");
                                        console.log("  selectedFieldIdForValidData:", selectedFieldIdForValidData);
                                        console.log("  selectedFieldObject:", selectedFieldObject);
                                        if (selectedFieldObject) {
                                            console.log(
                                                "  validData for selected field:",
                                                getValidDataForField(selectedFieldIdForValidData!)
                                            );
                                        }
                                        // ----------------------

                                        if (selectedFieldIdForValidData && selectedFieldObject) {
                                            const validDataEntries = getValidDataForField(
                                                selectedFieldIdForValidData
                                            );
                                            console.log(
                                                `  Condition TRUE. Rendering table/form. Found ${validDataEntries.length} valid data entries.`
                                            ); // DEBUG

                                            return (
                                                <div className="pt-4 space-y-6">
                                                    {/* Existing Valid Data Table */}
                                                    <div>
                                                        <h3 className="font-medium mb-1">
                                                            Valid Data for Field:{" "}
                                                            <span className="font-bold">{selectedFieldObject.fieldName}</span>
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground mb-4">
                                                            {selectedFieldObject.validDataNotes || "No notes for valid data."}
                                                        </p>
                                                        {validDataEntries.length > 0 ? (
                                                            <div className="overflow-x-auto border rounded-md">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead>Seq</TableHead>
                                                                            <TableHead>Data</TableHead>
                                                                            <TableHead>Desc</TableHead>
                                                                            <TableHead>Archive</TableHead>
                                                                            <TableHead></TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {validDataEntries.map((vd) => (
                                                                            <TableRow key={vd.id}>
                                                                                <TableCell>{vd.seqID}</TableCell>
                                                                                <TableCell className="font-mono">
                                                                                    {vd.validData}
                                                                                </TableCell>
                                                                                <TableCell>{vd.validDataDesc}</TableCell>
                                                                                <TableCell>{vd.archive ? "Yes" : "No"}</TableCell>
                                                                                <TableCell>
                                                                                    {/* --- UPDATED ACTIONS CELL --- */}
                                                                                    <div className="flex justify-center items-center gap-1">
                                                                                        {/* Edit Button */}
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-7 w-7 text-blue-600 hover:text-blue-800"
                                                                                            onClick={() => handleOpenEditValidDataDialog(vd)} // Open edit dialog
                                                                                            disabled={isSaving}
                                                                                            title={`Edit valid data ${vd.validData}`}
                                                                                        >
                                                                                            <Edit className="h-4 w-4" />
                                                                                        </Button>
                                                                                        {/* Delete Button (Existing) */}
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-7 w-7 text-red-600 hover:text-red-800"
                                                                                            onClick={() => handleDeleteValidData(vd.id, vd.validData)}
                                                                                            disabled={isSaving}
                                                                                            title={`Delete valid data ${vd.validData}`}
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
                                                            </div>
                                                        ) : (
                                                            <div className="text-center p-4 text-muted-foreground border rounded-md my-4">
                                                                <p>No valid data added for this field yet.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Add Valid Data Form */}
                                                    <div className="mt-6 space-y-4 border-t pt-6">
                                                        {/* ... Add Valid Data Form JSX ... */}
                                                        <h3 className="text-lg font-semibold">Add New Valid Data</h3>{" "}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <Label htmlFor="validDataValue">
                                                                    Value <span className="text-red-500">*</span>
                                                                </Label>
                                                                <Input
                                                                    id="validDataValue"
                                                                    value={newValidData.validData}
                                                                    onChange={(e) =>
                                                                        setNewValidData({
                                                                            ...newValidData,
                                                                            validData: e.target.value,
                                                                        })
                                                                    }
                                                                    disabled={isSaving}
                                                                    className="font-mono"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="validDataDesc">
                                                                    Description <span className="text-red-500">*</span>
                                                                </Label>
                                                                <Input
                                                                    id="validDataDesc"
                                                                    value={newValidData.validDataDesc}
                                                                    onChange={(e) =>
                                                                        setNewValidData({
                                                                            ...newValidData,
                                                                            validDataDesc: e.target.value,
                                                                        })
                                                                    }
                                                                    disabled={isSaving}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id="validDataArchive"
                                                                checked={newValidData.archive}
                                                                onCheckedChange={(checked) =>
                                                                    setNewValidData({
                                                                        ...newValidData,
                                                                        archive: checked === true,
                                                                    })
                                                                }
                                                                disabled={isSaving}
                                                            />
                                                            <Label htmlFor="validDataArchive" className="cursor-pointer">
                                                                Archive
                                                            </Label>
                                                        </div>
                                                        <div className="flex justify-end">
                                                            {" "}
                                                            <Button
                                                                onClick={handleAddValidData}
                                                                disabled={
                                                                    isSaving ||
                                                                    !newValidData.validData ||
                                                                    !newValidData.validDataDesc
                                                                }
                                                            >
                                                                <Plus className="mr-2 h-4 w-4" /> Add Valid Data
                                                            </Button>{" "}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            // Message shown when tab is active but no field is selected/found
                                            console.log("  Condition FALSE. Rendering 'Select a field...' message."); // DEBUG
                                            return (
                                                <div className="text-center p-8 text-muted-foreground pt-10">
                                                    Select a field from the 'Fields' tab table to view or add its valid
                                                    data entries.
                                                </div>
                                            );
                                        }
                                    })()}
                                </TabsContent>

                            </Tabs>
                        </div>
                    )}
                    {/* ... No File Selected View ... */}
                    {!isLoadingDetails && !selectedFile && !error && (
                        <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h2 className="text-lg font-medium mb-2">No file selected</h2>
                            {files.length > 0 ? (
                                <p className="text-muted-foreground">Select a file from the list.</p>
                            ) : (
                                <p className="text-muted-foreground">Create a new file to begin.</p>
                            )}
                            {/* Optionally add the "Create New File" button here too if desired */}
                            {/* <Button onClick={() => setShowCreateFileDialog(true)} disabled={isSaving} className="mt-4">
                                 <Plus className="mr-2 h-4 w-4" /> Create New File
                             </Button> */}
                        </div>
                    )}
                </div>
            </div>

            {/* Create File Dialog */}
            <Dialog
                open={showCreateFileDialog}
                onOpenChange={setShowCreateFileDialog}
            >
                {/* ... Dialog Content (same as before) ... */}
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New File Definition</DialogTitle>
                        <DialogDescription>
                            Define metadata. Fields are added later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="createShortName">
                                    Short Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="createShortName"
                                    value={newFile.shortName}
                                    onChange={(e) =>
                                        setNewFile((prev) => ({
                                            ...prev,
                                            shortName: e.target.value,
                                        }))
                                    }
                                    disabled={isSaving}
                                />
                            </div>
                            <div>
                                <Label htmlFor="createLongName">
                                    Long Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="createLongName"
                                    value={newFile.longName}
                                    onChange={(e) =>
                                        setNewFile((prev) => ({
                                            ...prev,
                                            longName: e.target.value,
                                        }))
                                    }
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="createFileLocation">File Location</Label>
                            <Input
                                id="createFileLocation"
                                value={newFile.fileLocation}
                                onChange={(e) =>
                                    setNewFile((prev) => ({
                                        ...prev,
                                        fileLocation: e.target.value,
                                    }))
                                }
                                disabled={isSaving}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="createFileSize">
                                    File Size (bytes) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="createFileSize"
                                    type="number"
                                    min="0"
                                    value={newFile.fileSize}
                                    onChange={(e) =>
                                        setNewFile((prev) => ({
                                            ...prev,
                                            fileSize: Number.parseInt(e.target.value) || 0,
                                        }))
                                    }
                                    disabled={isSaving}
                                />
                            </div>
                            <div>
                                <Label htmlFor="createDocLink">Document Link</Label>
                                <Input
                                    id="createDocLink"
                                    value={newFile.docLink}
                                    onChange={(e) =>
                                        setNewFile((prev) => ({ ...prev, docLink: e.target.value }))
                                    }
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="createArchive"
                                checked={newFile.archive}
                                onCheckedChange={(checked) =>
                                    setNewFile((prev) => ({ ...prev, archive: checked === true }))
                                }
                                disabled={isSaving}
                            />
                            <Label htmlFor="createArchive" className="cursor-pointer">
                                Archive
                            </Label>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 border-t pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowCreateFileDialog(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateFile}
                            disabled={
                                isSaving ||
                                !newFile.shortName ||
                                !newFile.longName ||
                                newFile.fileSize < 0
                            }
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}{" "}
                            Create File
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default Files;
