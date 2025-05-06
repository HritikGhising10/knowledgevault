// src/components/BusinessProcessManagement.tsx
// No "use client" needed

import React from "react";
import { useState, useEffect, useCallback } from "react"; // Import hooks
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    CalendarIcon,
    Edit,
    FilePlus,
    Plus,
    Save,
    Search,
    Trash2,
    Loader2,
    AlertCircle,
    ArrowLeft,
} from "lucide-react"; // Added Loader, Alert, ArrowLeft

// --- Import API Helper & Types ---
import {
    ProcessListItemDto,
    ProcessDetailsDto,
    ProcessStepDetailsDto,
    CreateProcessDto,
    UpdateProcessDto,
    CreateProcessStepDto,
    UpdateProcessStepDto,
    ProcessStepFormData, // Import types
} from "./processTypes"; // Adjust path as needed
import { apiRequest } from "../Forum/apiUtils";

// --- Component ---
export default function BusinessProcessManagement() {
    // State for view management
    const [currentView, setCurrentView] = useState<"list" | "process">("list");

    // State for process list
    const [processes, setProcesses] = useState<ProcessListItemDto[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // State for viewing/editing a single process
    const [currentProcess, setCurrentProcess] =
        useState<ProcessDetailsDto | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"process" | "steps">("process");

    // State for process form (used for both create and edit)
    // Initialize based on CreateProcessDto structure initially
    const initialProcessFormData: CreateProcessDto = {
        processName: "",
        processDescription: "",
        programType: "PC", // Default type
        keyProgrammers: "",
        keyUsers: "",
        archive: false,
    };
    const [processFormData, setProcessFormData] = useState<
        CreateProcessDto | UpdateProcessDto
    >(initialProcessFormData);
    const [processFormErrors, setProcessFormErrors] = useState<
        Record<string, string>
    >({});
    const [isSavingProcess, setIsSavingProcess] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [viewingProcess, setViewingProcess] = useState<ProcessDetailsDto | null>(null); // Process being viewed in dialog
    const [activeDialogTab, setActiveDialogTab] = useState<"process" | "steps">("process");
    const [shownestedProcessSteps, setShowNestedProcessSteps] = useState(false); // State for showing nested steps
    const [nestedProcessStep, setNestedProcessStep] = useState<ProcessStepDetailsDto>(); // State for nested steps data
    const [nestedDialogOpen, setNestedDialogOpen] = useState(false); // State for nested steps dialog
    // State for process steps dialog/form
    const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
    const [currentStepFormData, setCurrentStepFormData] =
        useState<ProcessStepFormData | null>(null); // Use ProcessStepFormData
    const [stepToDelete, setStepToDelete] =
        useState<ProcessStepDetailsDto | null>(null); // Store full step for confirmation message
    const [stepFormErrors, setStepFormErrors] = useState<Record<string, string>>(
        {}
    );


    // 
    React.useEffect(() => {
        // if there is ?tab=process in the URL, set the active tab to process
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get("tab");

        if (tab === "process") {
            setActiveTab("process");
        } else if (tab === "steps") {
            setActiveTab("steps");
        } else {
            setActiveTab("process"); // Default to process tab
        }

    }, [
        currentProcess,
    ]);
    const [isSavingStep, setIsSavingStep] = useState(false);

    // --- Data Fetching ---
    const fetchProcesses = useCallback(async () => {
        setIsLoadingList(true);
        setListError(null);
        try {
            const data = await apiRequest<ProcessListItemDto[]>("/processes"); // Use correct endpoint
            setProcesses(data);
        } catch (err: any) {
            setListError(err.message || "Failed to load processes.");
            setProcesses([]);
        } finally {
            setIsLoadingList(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchProcesses();
    }, [fetchProcesses]);

    const fetchAndShowProcessDetails = useCallback(async (processId: string) => {
        setIsLoadingDetails(true);
        setDetailsError(null);
        setViewingProcess(null); // Reset previous while loading
        setShowDetailsDialog(true); // Open dialog immediately (shows loader)
        setActiveDialogTab("process"); // Default to process tab

        try {
            const data = await apiRequest<ProcessDetailsDto>(`/processes/${processId}`);
            setViewingProcess(data);
            // If you add editing later, pre-fill form data here:
            // setProcessEditFormData({ /* ... copy data ... */});
        } catch (err: any) {
            setDetailsError(err.message || `Failed to load process details.`);
            // Keep dialog open to show error
        } finally {
            setIsLoadingDetails(false);
        }
    }, []);
    const handleViewProcessDetails = (process: ProcessListItemDto) => {
        console.log("Opening details for:", process.processName); // Debug log
        fetchAndShowProcessDetails(process.id); // Calls the fetcher function
    };

    // --- NEW: Close the main details dialog ---
    const handleCloseDetailsDialog = () => {
        setShowDetailsDialog(false);
        // Delay resetting viewed process slightly to avoid flicker during close animation
        setTimeout(() => {
            setViewingProcess(null);
            setDetailsError(null);
            // Reset edit state if you add it later
            // setIsEditingInDialog(false);
            // setProcessEditFormData({});
            // setProcessFormErrors({});
        }, 300); // Adjust timing if needed
    };

    const fetchProcessDetails = useCallback(async (processId: string) => {
        setIsLoadingDetails(true);
        setDetailsError(null);
        setCurrentProcess(null);
        try {
            const data = await apiRequest<ProcessDetailsDto>(
                `/processes/${processId}`
            );
            setCurrentProcess(data);
            // Pre-fill form data for editing
            setProcessFormData({
                processName: data.processName,
                processDescription: data.processDescription ?? "",
                programType: data.programType ?? "PC",
                keyProgrammers: data.keyProgrammers.join(", "), // Join array for display/edit
                keyUsers: data.keyUsers.join(", "), // Join array for display/edit
                archive: data.archive,
            });
            setActiveTab("process"); // Default to process tab on load
        } catch (err: any) {
            setDetailsError(err.message || `Failed to load process ${processId}.`);
            setCurrentProcess(null);
        } finally {
            setIsLoadingDetails(false);
        }
    }, []);

    // --- Filtering ---
    const filteredProcesses = processes.filter(
        (process) =>
            process.processName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (process.processDescription || "")
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            (process.programType || "")
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
    );

    // --- Date Formatting ---
    const formatDate = (dateString: string | undefined | null) =>
        dateString ? new Date(dateString).toLocaleDateString() : "N/A";
    const formatDateTime = (dateString: string | undefined | null) =>
        dateString ? new Date(dateString).toLocaleString() : "N/A";

    // ===== PROCESS LIST FUNCTIONS =====
    const handleCreateNewProcess = () => {
        setCurrentProcess(null); // No current process when creating
        setProcessFormData(initialProcessFormData); // Reset form
        setProcessFormErrors({});
        setActiveTab("process");
        setCurrentView("process"); // Switch view to the form
    };

    const handleEditProcess = (process: ProcessListItemDto) => {
        fetchProcessDetails(process.id); // Fetch full details when editing
        setCurrentView("process"); // Switch view
    };

    const handleDeleteProcess = async (id: string, name: string) => {
        // Confirmation handled by AlertDialog trigger
        setIsSavingProcess(true); // Use saving indicator for delete
        setListError(null);
        try {
            await apiRequest(`/processes/${id}`, { method: "DELETE" });
            // toast.success(`Process "${name}" deleted.`); // Optional feedback
            if (currentProcess?.id === id) {
                // If deleting the currently viewed process
                handleBackToList();
            }
            fetchProcesses(); // Refresh list
        } catch (err: any) {
            setListError(err.message || `Failed to delete process "${name}".`);
        } finally {
            setIsSavingProcess(false);
        }
    };

    const handleBackToList = () => {
        setCurrentView("list");
        setCurrentProcess(null);
        setDetailsError(null); // Clear details error when going back
        setProcessFormErrors({}); // Clear form errors
    };

    // ===== PROCESS FORM FUNCTIONS =====
    const handleProcessFormChange = (
        field: keyof CreateProcessDto | keyof UpdateProcessDto,
        value: string | boolean
    ) => {
        setProcessFormData((prev) => ({ ...prev, [field]: value }));
        // Clear validation error for the changed field
        if (processFormErrors[field]) {
            setProcessFormErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const validateProcessForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!processFormData.processName?.trim())
            newErrors.processName = "Process name required";
        if (!processFormData.processDescription?.trim())
            newErrors.processDescription = "Description required";
        if (!processFormData.programType)
            newErrors.programType = "Program type required";
        setProcessFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveProcess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateProcessForm()) return;

        setIsSavingProcess(true);
        setDetailsError(null); // Use details error for save errors
        const isUpdating = !!currentProcess;
        const url = isUpdating ? `/processes/${currentProcess.id}` : "/processes";
        const method = isUpdating ? "PATCH" : "POST";

        // Prepare DTO (backend expects comma-separated strings, which is what form state has)
        const dto = { ...processFormData };

        try {
            const savedProcess = await apiRequest<ProcessDetailsDto>(url, {
                method,
                body: JSON.stringify(dto),
            });
            // toast.success(`Process ${isUpdating ? 'updated' : 'created'}.`); // Optional feedback

            if (isUpdating) {
                setCurrentProcess(savedProcess); // Update current process state
                setProcessFormData({
                    // Update form state from saved data
                    processName: savedProcess.processName,
                    processDescription: savedProcess.processDescription ?? "",
                    programType: savedProcess.programType ?? "PC",
                    keyProgrammers: savedProcess.keyProgrammers.join(", "),
                    keyUsers: savedProcess.keyUsers.join(", "),
                    archive: savedProcess.archive,
                });
                fetchProcesses(); // Refresh list in case name/type changed
            } else {
                fetchProcesses(); // Refresh list
                setCurrentProcess(savedProcess); // Set the newly created process as current
                setProcessFormData({
                    // Update form state from saved data
                    processName: savedProcess.processName,
                    processDescription: savedProcess.processDescription ?? "",
                    programType: savedProcess.programType ?? "PC",
                    keyProgrammers: savedProcess.keyProgrammers.join(", "),
                    keyUsers: savedProcess.keyUsers.join(", "),
                    archive: savedProcess.archive,
                });
            }
            setActiveTab("steps"); // Move to steps tab after saving process info
        } catch (err: any) {
            setDetailsError(err.message || `Failed to save process.`);
        } finally {
            setIsSavingProcess(false);
        }
    };

    // ===== PROCESS STEPS FUNCTIONS =====
    const generateNextSeqId = (): string => {
        // Use optional chaining and provide default empty array
        const steps = currentProcess?.steps ?? [];

        if (steps.length === 0) {
            return "01";
        }

        const numericSteps = steps
            .map((step) => parseInt(step.seqID, 10))
            .filter((num) => !isNaN(num)); // Filter out non-numeric sequences

        if (numericSteps.length === 0) {
            console.warn(
                "No numeric sequences found, defaulting next sequence logic."
            );
            return (steps.length + 1).toString().padStart(2, "0");
        }

        const maxSeq = Math.max(...numericSteps);
        return (maxSeq + 1).toString().padStart(2, "0");
    };

    const handleOpenStepDialog = (step?: ProcessStepDetailsDto) => {
        setStepFormErrors({}); // Clear errors
        if (step) {
            setCurrentStepFormData({
                id: step.id,
                seqID: step.seqID,
                processStep: step.processStep,
                processStepDesc: step.processStepDesc ?? "",
                processStepNotes: step.processStepNotes ?? "",
                archive: step.archive,
            });
        } else {
            // Adding new step
            setCurrentStepFormData({
                // id is undefined for new steps
                seqID: generateNextSeqId(), // Auto-generate next sequence
                processStep: "",
                processStepDesc: "",
                processStepNotes: "",
                archive: false,
            });
        }
        setIsStepDialogOpen(true);


    };

    const handleStepChange = (
        field: keyof ProcessStepFormData,
        value: string | boolean
    ) => {
        setCurrentStepFormData((prev) =>
            prev ? { ...prev, [field]: value } : null
        );
        if (stepFormErrors[field]) {
            setStepFormErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };




    const validateStepForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!currentStepFormData?.seqID?.trim())
            newErrors.seqID = "Sequence # required";
        if (!currentStepFormData?.processStep?.trim())
            newErrors.processStep = "Step Name required";
        if (!currentStepFormData?.processStepDesc?.trim())
            newErrors.processStepDesc = "Description required";
        setStepFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveStep = async () => {
        if (!validateStepForm() || !currentStepFormData || !currentProcess) return;

        setIsSavingStep(true);
        setDetailsError(null); // Use details error pane for step errors too
        const isUpdating = !!currentStepFormData.id;
        const url = isUpdating
            ? `/processes/steps/${currentStepFormData.id}`
            : `/processes/${currentProcess.id}/steps`;
        const method = isUpdating ? "PATCH" : "POST";

        // Prepare DTO - remove fields not needed for create/update
        const dto: CreateProcessStepDto | UpdateProcessStepDto = {
            processStep: currentStepFormData.processStep!, // Assert non-null due to validation
            processStepDesc: currentStepFormData.processStepDesc,
            processStepNotes: currentStepFormData.processStepNotes,
            archive: currentStepFormData.archive,
            // Only include seqID for creation
            ...(!isUpdating && { seqID: currentStepFormData.seqID! }),
        };

        try {
            await apiRequest<ProcessStepDetailsDto>(url, {
                method,
                body: JSON.stringify(dto),
            });
            // toast.success(`Step ${isUpdating ? 'updated' : 'added'}.`); // Optional
            setIsStepDialogOpen(false);
            setCurrentStepFormData(null); // Clear form state
            fetchProcessDetails(currentProcess.id); // Refresh process details to show updated steps
        } catch (err: any) {
            setDetailsError(err.message || `Failed to save step.`);
        } finally {
            // Show error in main details pane
            setIsSavingStep(false);
        }
    };

    const handleDeleteStep = async () => {
        if (!stepToDelete || !currentProcess) return;

        setIsSavingStep(true);
        setDetailsError(null);
        try {
            await apiRequest(`/processes/steps/${stepToDelete.id}`, {
                method: "DELETE",
            });
            // toast.success(`Step "${stepToDelete.processStep}" deleted.`); // Optional
            setStepToDelete(null); // Clear the confirmation state
            fetchProcessDetails(currentProcess.id); // Refresh details
        } catch (err: any) {
            setDetailsError(err.message || `Failed to delete step.`);
        } finally {
            setIsSavingStep(false);
        }
    };

    // ===== RENDER FUNCTIONS =====



    function handleShowNestedProcessSteps(steps: ProcessStepDetailsDto) {
        setShowNestedProcessSteps(true);
        setNestedDialogOpen(true);
        setNestedProcessStep(steps);
    }

    // Render the process list view
    const renderProcessList = () => (
        <div className="container mx-auto py-8 px-4">


            <Dialog open={nestedDialogOpen} onOpenChange={setNestedDialogOpen}>
                <DialogContent className="h-[85vh] flex flex-col"
                    style={{
                        maxWidth: "50vw", // Adjust max width for smaller screens
                        maxHeight: "50vh", // Adjust max height for smaller screens
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing on outside click if needed
                >

                    <DialogHeader>
                        <DialogTitle>{nestedProcessStep?.processStep}</DialogTitle>
                        <DialogDescription>Details for the selected process step.</DialogDescription>
                    </DialogHeader>

                    {/* Dialog Body */}
                    <div className="flex-grow overflow-y-auto pr-2 py-4"> {/* Allow content to scroll */}
                        {nestedProcessStep ? (
                            // --- Display Process Step Details Here ---
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                                    <Label className="font-semibold col-span-1">Step Name:</Label>
                                    <div className="col-span-2">{nestedProcessStep.processStep}</div>

                                    <Label className="font-semibold col-span-1">Description:</Label>
                                    <div className="col-span-2 whitespace-pre-wrap">{nestedProcessStep.processStepDesc || '-'}</div>

                                    <Label className="font-semibold col-span-1">Notes:</Label>
                                    <div className="col-span-2 whitespace-pre-wrap">{nestedProcessStep.processStepNotes || '-'}</div>

                                    <Label className="font-semibold col-span-1">Status:</Label>
                                    <div className="col-span-2"><Badge variant={nestedProcessStep.archive ? "outline" : "secondary"}>{nestedProcessStep.archive ? "Archived" : "Active"}</Badge></div>

                                    <Label className="font-semibold col-span-1">Author:</Label>
                                    <div className="col-span-2">{nestedProcessStep.author?.name || nestedProcessStep.author?.username || 'N/A'}</div>

                                    <Label className="font-semibold col-span-1">Created:</Label>
                                    <div className="col-span-2">{formatDateTime(nestedProcessStep.createdAt)}</div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No process step details available.</p> /* Fallback */
                        )}
                    </div>

                    <DialogFooter className="mt-auto flex-shrink-0 pt-4 border-t">
                        {/* Add Edit/Save buttons here later if needed */}
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>



            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}> {/* Control via state */}
                <DialogContent className="h-[85vh] flex flex-col"
                    style={{
                        maxWidth: "80vw", // Adjust max width for smaller screens
                        maxHeight: "85vh", // Adjust max height for smaller screens
                    }}
                > {/* Adjust size; Prevent closing on outside click if needed */}
                    <DialogHeader>
                        <DialogTitle>{viewingProcess?.processName ?? (isLoadingDetails ? "Loading..." : "Process Details")}</DialogTitle>
                        <DialogDescription>Details for the selected process.</DialogDescription>
                    </DialogHeader>

                    {/* Dialog Body */}
                    <div className="flex-grow overflow-y-auto pr-2 py-4"> {/* Allow content to scroll */}
                        {isLoadingDetails ? (
                            <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                        ) : detailsError ? (
                            <div className="my-2 p-3 bg-red-100 text-red-700 border border-red-300 rounded flex items-center">
                                <AlertCircle className="h-5 w-5 mr-2" /> {detailsError}
                            </div>
                        ) : viewingProcess ? (
                            // --- Display Process Details Here ---
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm ">
                                    <Label className="font-semibold col-span-1">Process Name:</Label>
                                    <div className="col-span-2">{viewingProcess.processName}</div>

                                    <Label className="font-semibold col-span-1">Description:</Label>
                                    <div className="col-span-2 whitespace-pre-wrap">{viewingProcess.processDescription || '-'}</div>

                                    <Label className="font-semibold col-span-1">Program Type:</Label>
                                    <div className="col-span-2">{viewingProcess.programType || '-'}</div>

                                    <Label className="font-semibold col-span-1">Key Programmers:</Label>
                                    <div className="col-span-2">{viewingProcess.keyProgrammers?.length > 0 ? viewingProcess.keyProgrammers.map((p, i) => <Badge key={i} variant="outline" className="mr-1 mb-1">{p}</Badge>) : '-'}</div>

                                    <Label className="font-semibold col-span-1">Key Users:</Label>
                                    <div className="col-span-2">{viewingProcess.keyUsers?.length > 0 ? viewingProcess.keyUsers.map((u, i) => <Badge key={i} variant="outline" className="mr-1 mb-1">{u}</Badge>) : '-'}</div>

                                    <Label className="font-semibold col-span-1">Status:</Label>
                                    <div className="col-span-2"><Badge variant={viewingProcess.archive ? "outline" : "secondary"}>{viewingProcess.archive ? "Archived" : "Active"}</Badge></div>

                                    <Label className="font-semibold col-span-1">Author:</Label>
                                    <div className="col-span-2">{viewingProcess.author?.name || viewingProcess.author?.username || 'N/A'}</div>

                                    <Label className="font-semibold col-span-1">Created:</Label>
                                    <div className="col-span-2">{formatDateTime(viewingProcess.createdAt)}</div>
                                </div>
                                <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-2">Process Steps ({viewingProcess.steps?.length ?? 0})</h4>
                                    {/* Render steps table or list here if needed */}
                                    {viewingProcess.steps && viewingProcess.steps.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow >
                                                        <TableHead>Seq #</TableHead>
                                                        <TableHead>Step Name</TableHead>
                                                        <TableHead>Description</TableHead>
                                                        <TableHead>Notes</TableHead>
                                                        <TableHead>Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {viewingProcess.steps.map((step) => (
                                                        <TableRow key={step.id} onClick={() => handleShowNestedProcessSteps(step)} className="cursor-pointer hover:bg-muted/50">
                                                            <TableCell>{step.seqID}</TableCell>
                                                            <TableCell>{step.processStep}</TableCell>
                                                            <TableCell>{step.processStepDesc || '-'}</TableCell>
                                                            <TableCell>{step.processStepNotes || '-'}</TableCell>
                                                            <TableCell><Badge variant={step.archive ? "outline" : "secondary"}>{step.archive ? "Archived" : "Active"}</Badge></TableCell>

                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No steps defined for this process.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No process details available.</p> /* Fallback */
                        )}
                    </div>

                    <DialogFooter className="mt-auto flex-shrink-0 pt-4 border-t">
                        {/* Add Edit/Save buttons here later if needed */}
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* ----------------------------- */}

            {/* Nested Step Add/Edit Dialog (keep this for when adding/editing steps) */}
            <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
                {/* ... Step Dialog Content remains the same ... */}
            </Dialog>
            <Card>
                <CardHeader>
                    {/* ... Header with Title and New Process Button ... */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl">Business Processes</CardTitle>
                            <CardDescription>Manage processes and steps</CardDescription>
                        </div>
                        <Button onClick={handleCreateNewProcess}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Process
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* ... Search Bar and Count ... */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search processes..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                                Showing {filteredProcesses.length} of {processes.length}
                            </span>
                        </div>
                    </div>
                    {/* Loading Indicator */}
                    {isLoadingList && (
                        <div className="text-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        </div>
                    )}
                    {/* Error Display */}
                    {listError && !isLoadingList && (
                        <div className="text-center py-10 text-red-600 border rounded-md bg-red-50">
                            {listError}
                        </div>
                    )}
                    {/* Table or Empty State */}
                    {!isLoadingList &&
                        !listError &&
                        (filteredProcesses.length > 0 ? (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Desc</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProcesses.map((process) => (
                                            <TableRow
                                                key={process.id}
                                                // --- ADD onClick HANDLER TO THE ROW ---
                                                onClick={() => handleViewProcessDetails(process)}
                                                className="cursor-pointer hover:bg-muted/50" // Add cursor and hover effect
                                            >
                                                <TableCell className="font-medium">{process.processName}</TableCell>
                                                <TableCell className="hidden md:table-cell max-w-[300px] truncate" title={process.processDescription || ''}>{process.processDescription}</TableCell>
                                                <TableCell>{process.programType}</TableCell>
                                                <TableCell className="hidden md:table-cell">{formatDate(process.createdAt)}</TableCell>
                                                <TableCell><Badge variant={process.archive ? "outline" : "secondary"}>{process.archive ? "Archived" : "Active"}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {/* Edit Button - Now just opens dialog */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Edit Process Info"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Prevent row's onClick
                                                                handleEditProcess(process); // Still open dialog
                                                            }}
                                                            className="h-7 w-7" // Adjust size if needed
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        {/* Delete Button */}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-red-500 hover:text-red-700 h-7 w-7" // Adjust size
                                                                    title="Delete Process"
                                                                    // Add stopPropagation
                                                                    onClick={(e) => e.stopPropagation()} // Prevent row's onClick
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent onClick={(e) => e.stopPropagation()} > {/* Stop propagation on dialog too */}
                                                                <AlertDialogHeader><AlertDialogTitle>Delete Process</AlertDialogTitle><AlertDialogDescription>Delete "{process.processName}"? This deletes all steps.</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteProcess(process.id, process.processName)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-10 border rounded-md">
                                <p className="text-gray-500">
                                    No processes found matching your search.
                                </p>
                            </div>
                        ))}
                </CardContent>
            </Card>
        </div>
    );

    // Render the form for creating/editing a process and its steps
    const renderProcessManagement = () => (
        <div className="container mx-auto py-8 px-4">
            {/* Back Button */}
            <Button variant="outline" onClick={handleBackToList} className="mb-6">
                {" "}
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List{" "}
            </Button>

            {/* Loading Indicator for Details */}
            {isLoadingDetails && (
                <div className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </div>
            )}

            {/* Error Display for Details */}
            {detailsError && !isLoadingDetails && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" /> {detailsError}
                </div>
            )}

            {/* Render form only if not loading details OR if creating new (currentProcess is null) */}
            {!isLoadingDetails && (currentProcess || currentView === "process") && (
                <>
                    <h1 className="text-3xl font-bold mb-6">
                        {currentProcess ? "Edit Process" : "Create New Process"}
                    </h1>
                    {/* Progress Indicator */}
                    <div className="mb-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span
                                className={
                                    activeTab === "process" ? "font-medium text-primary" : ""
                                }
                            >
                                1. Process Info
                            </span>
                            <span>→</span>
                            <span
                                className={
                                    activeTab === "steps" ? "font-medium text-primary" : ""
                                }
                            >
                                2. Process Steps
                            </span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) =>
                            setActiveTab(value as "process" | "steps")
                        }
                        className="w-full"
                    >
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="process">Process Information</TabsTrigger>
                            <TabsTrigger
                                value="steps"
                                disabled={!currentProcess}
                                title={!currentProcess ? "Save process details first" : ""}
                            >
                                Process Steps
                            </TabsTrigger>
                        </TabsList>

                        {/* Process Info Tab */}
                        <TabsContent value="process">
                            <Card>
                                {" "}
                                {/* Removed p-6, let Card handle padding */}
                                <form onSubmit={handleSaveProcess}>
                                    <CardHeader>
                                        <CardTitle>
                                            {currentProcess
                                                ? "Edit Process Information"
                                                : "New Process Details"}
                                        </CardTitle>
                                        <CardDescription>
                                            {currentProcess
                                                ? "Update the core details of this process."
                                                : "Fill out the information below."}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Form Fields */}
                                        {/* Process Name / Type */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="processName">
                                                    Name <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="processName"
                                                    value={processFormData.processName || ""}
                                                    onChange={(e) =>
                                                        handleProcessFormChange(
                                                            "processName",
                                                            e.target.value
                                                        )
                                                    }
                                                    className={
                                                        processFormErrors.processName
                                                            ? "border-red-500"
                                                            : ""
                                                    }
                                                />
                                                {processFormErrors.processName && (
                                                    <p className="text-sm text-red-500">
                                                        {processFormErrors.processName}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="programType">
                                                    Type <span className="text-red-500">*</span>
                                                </Label>
                                                <Select
                                                    value={processFormData.programType || ""}
                                                    onValueChange={(value) =>
                                                        handleProcessFormChange("programType", value)
                                                    }
                                                >
                                                    <SelectTrigger
                                                        className={
                                                            processFormErrors.programType
                                                                ? "border-red-500"
                                                                : ""
                                                        }
                                                    >
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Mainframe">Mainframe</SelectItem>
                                                        <SelectItem value="PC">PC</SelectItem>
                                                        <SelectItem value="PC Mainframe Combo">
                                                            PC Mainframe Combo
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {processFormErrors.programType && (
                                                    <p className="text-sm text-red-500">
                                                        {processFormErrors.programType}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Description */}
                                        <div className="space-y-2">
                                            <Label htmlFor="processDescription">
                                                Description <span className="text-red-500">*</span>
                                            </Label>
                                            <Textarea
                                                id="processDescription"
                                                value={processFormData.processDescription || ""}
                                                onChange={(e) =>
                                                    handleProcessFormChange(
                                                        "processDescription",
                                                        e.target.value
                                                    )
                                                }
                                                className={`min-h-[100px] ${processFormErrors.processDescription
                                                    ? "border-red-500"
                                                    : ""
                                                    }`}
                                            />
                                            {processFormErrors.processDescription && (
                                                <p className="text-sm text-red-500">
                                                    {processFormErrors.processDescription}
                                                </p>
                                            )}
                                        </div>
                                        {/* Key Programmers / Users */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="keyProgrammers">
                                                    Key Programmer(s)
                                                </Label>
                                                <Input
                                                    id="keyProgrammers"
                                                    value={processFormData.keyProgrammers || ""}
                                                    onChange={(e) =>
                                                        handleProcessFormChange(
                                                            "keyProgrammers",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Comma-separated"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="keyUsers">Key User(s)</Label>
                                                <Input
                                                    id="keyUsers"
                                                    value={processFormData.keyUsers || ""}
                                                    onChange={(e) =>
                                                        handleProcessFormChange("keyUsers", e.target.value)
                                                    }
                                                    placeholder="Comma-separated"
                                                />
                                            </div>
                                        </div>
                                        {/* UserID / Archive */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* User ID field removed - set on backend */}
                                            <div className="flex items-center space-x-2 h-full pt-6">
                                                {" "}
                                                {/* Adjusted padding */}
                                                <Checkbox
                                                    id="archive"
                                                    checked={!!processFormData.archive}
                                                    onCheckedChange={(checked) =>
                                                        handleProcessFormChange(
                                                            "archive",
                                                            checked as boolean
                                                        )
                                                    }
                                                />
                                                <Label htmlFor="archive">Archive this process</Label>
                                            </div>
                                        </div>
                                        {/* Timestamps (Readonly) */}
                                        {currentProcess && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                                <div className="flex items-center space-x-2">
                                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />{" "}
                                                    <span className="text-sm text-muted-foreground">
                                                        Created: {formatDateTime(currentProcess.createdAt)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />{" "}
                                                    <span className="text-sm text-muted-foreground">
                                                        Updated: {formatDateTime(currentProcess.updatedAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex justify-end">
                                        <Button type="submit" disabled={isSavingProcess}>
                                            {" "}
                                            {isSavingProcess ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Save Process
                                                </>
                                            )}{" "}
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>

                        {/* Process Steps Tab */}
                        <TabsContent value="steps">
                            {currentProcess && (
                                <Card>
                                    {" "}
                                    {/* Removed p-6 */}
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <CardTitle>Process Steps</CardTitle>
                                                <CardDescription>
                                                    Define the steps for:{" "}
                                                    <span className="font-medium">
                                                        {currentProcess.processName}
                                                    </span>
                                                </CardDescription>
                                            </div>
                                            <Button
                                                onClick={() => handleOpenStepDialog()}
                                                disabled={isSavingStep}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Step
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {/* Loading Indicator for Steps (within details loading) */}
                                        {isLoadingDetails && (
                                            <div className="text-center py-6">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                            </div>
                                        )}

                                        {/* Step Table or Empty State */}
                                        {!isLoadingDetails && currentProcess.steps?.length > 0 ? (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Seq</TableHead>
                                                        <TableHead>Step</TableHead>
                                                        <TableHead>Desc</TableHead>
                                                        <TableHead>Notes</TableHead>
                                                        <TableHead>Created</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead className="w-[100px]">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {currentProcess.steps
                                                        .sort((a, b) =>
                                                            a.seqID.localeCompare(b.seqID, undefined, {
                                                                numeric: true,
                                                            })
                                                        )
                                                        .map(
                                                            (
                                                                step
                                                            ) => (
                                                                <TableRow key={step.id}>
                                                                    <TableCell>{step.seqID}</TableCell>
                                                                    <TableCell>{step.processStep}</TableCell>
                                                                    <TableCell
                                                                        className="max-w-[200px] truncate"
                                                                        title={step.processStepDesc || ""}
                                                                    >
                                                                        {step.processStepDesc}
                                                                    </TableCell>
                                                                    <TableCell
                                                                        className="max-w-[200px] truncate"
                                                                        title={step.processStepNotes || ""}
                                                                    >
                                                                        {step.processStepNotes}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {formatDate(step.createdAt)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge
                                                                            variant={
                                                                                step.archive ? "outline" : "secondary"
                                                                            }
                                                                        >
                                                                            {step.archive ? "Archived" : "Active"}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex space-x-1">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                title="Edit Step"
                                                                                className="h-7 w-7"
                                                                                onClick={() =>
                                                                                    handleOpenStepDialog(step)
                                                                                }
                                                                            >
                                                                                <Edit className="h-4 w-4" />
                                                                            </Button>
                                                                            <AlertDialog>
                                                                                <AlertDialogTrigger asChild>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="text-red-500 hover:text-red-700 h-7 w-7"
                                                                                        title="Delete Step"
                                                                                        onClick={() =>
                                                                                            setStepToDelete(step)
                                                                                        }
                                                                                    >
                                                                                        <Trash2 className="h-4 w-4" />
                                                                                    </Button>
                                                                                </AlertDialogTrigger>
                                                                                <AlertDialogContent>
                                                                                    <AlertDialogHeader>
                                                                                        <AlertDialogTitle>
                                                                                            Delete Step
                                                                                        </AlertDialogTitle>
                                                                                        <AlertDialogDescription>
                                                                                            Delete step "{step.seqID} -{" "}
                                                                                            {step.processStep}"?
                                                                                        </AlertDialogDescription>
                                                                                    </AlertDialogHeader>
                                                                                    <AlertDialogFooter>
                                                                                        <AlertDialogCancel
                                                                                            onClick={() =>
                                                                                                setStepToDelete(null)
                                                                                            }
                                                                                        >
                                                                                            Cancel
                                                                                        </AlertDialogCancel>
                                                                                        <AlertDialogAction
                                                                                            onClick={handleDeleteStep}
                                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                                        >
                                                                                            Delete
                                                                                        </AlertDialogAction>
                                                                                    </AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialog>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        )}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            !isLoadingDetails && (
                                                <div className="text-center py-8 border rounded-md bg-gray-50">
                                                    <p className="text-gray-500">No steps defined yet.</p>
                                                </div>
                                            )
                                        )}
                                    </CardContent>
                                    {/* Step Dialog */}
                                    <Dialog
                                        open={isStepDialogOpen}
                                        onOpenChange={setIsStepDialogOpen}
                                    >
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>
                                                    {currentStepFormData?.id ? "Edit" : "Add New"} Process
                                                    Step
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Fill in the details for this step.
                                                </DialogDescription>
                                            </DialogHeader>
                                            {/* Step Form */}
                                            <div className="grid gap-4 py-4">
                                                {/* Seq # */}
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="stepSeqID" className="text-right">
                                                        Seq # <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="stepSeqID"
                                                        value={currentStepFormData?.seqID || ""}
                                                        onChange={(e) =>
                                                            handleStepChange("seqID", e.target.value)
                                                        }
                                                        className={`col-span-3 ${stepFormErrors.seqID ? "border-red-500" : ""
                                                            }`}
                                                    />
                                                    {stepFormErrors.seqID && (
                                                        <p className="col-span-3 col-start-2 text-sm text-red-500">
                                                            {stepFormErrors.seqID}
                                                        </p>
                                                    )}
                                                </div>
                                                {/* Step Name */}
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label
                                                        htmlFor="stepProcessStep"
                                                        className="text-right"
                                                    >
                                                        Step Name <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="stepProcessStep"
                                                        value={currentStepFormData?.processStep || ""}
                                                        onChange={(e) =>
                                                            handleStepChange("processStep", e.target.value)
                                                        }
                                                        className={`col-span-3 ${stepFormErrors.processStep ? "border-red-500" : ""
                                                            }`}
                                                    />
                                                    {stepFormErrors.processStep && (
                                                        <p className="col-span-3 col-start-2 text-sm text-red-500">
                                                            {stepFormErrors.processStep}
                                                        </p>
                                                    )}
                                                </div>
                                                {/* Description */}
                                                <div className="grid grid-cols-4 items-start gap-4">
                                                    <Label
                                                        htmlFor="stepProcessStepDesc"
                                                        className="text-right pt-2"
                                                    >
                                                        Desc <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Textarea
                                                        id="stepProcessStepDesc"
                                                        value={currentStepFormData?.processStepDesc || ""}
                                                        onChange={(e) =>
                                                            handleStepChange(
                                                                "processStepDesc",
                                                                e.target.value
                                                            )
                                                        }
                                                        className={`col-span-3 min-h-[60px] ${stepFormErrors.processStepDesc
                                                            ? "border-red-500"
                                                            : ""
                                                            }`}
                                                    />
                                                    {stepFormErrors.processStepDesc && (
                                                        <p className="col-span-3 col-start-2 text-sm text-red-500">
                                                            {stepFormErrors.processStepDesc}
                                                        </p>
                                                    )}
                                                </div>
                                                {/* Notes */}
                                                <div className="grid grid-cols-4 items-start gap-4">
                                                    <Label
                                                        htmlFor="stepProcessStepNotes"
                                                        className="text-right pt-2"
                                                    >
                                                        Notes
                                                    </Label>
                                                    <Textarea
                                                        id="stepProcessStepNotes"
                                                        value={currentStepFormData?.processStepNotes || ""}
                                                        onChange={(e) =>
                                                            handleStepChange(
                                                                "processStepNotes",
                                                                e.target.value
                                                            )
                                                        }
                                                        className="col-span-3 min-h-[60px]"
                                                    />
                                                </div>
                                                {/* Archive */}
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label className="text-right">Archive</Label>
                                                    <div className="col-span-3 flex items-center space-x-2">
                                                        <Checkbox
                                                            id="stepArchive"
                                                            checked={!!currentStepFormData?.archive}
                                                            onCheckedChange={(checked) =>
                                                                handleStepChange("archive", checked as boolean)
                                                            }
                                                        />
                                                        <Label
                                                            htmlFor="stepArchive"
                                                            className="cursor-pointer"
                                                        >
                                                            Archive step
                                                        </Label>
                                                    </div>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline" disabled={isSavingStep}>
                                                        Cancel
                                                    </Button>
                                                </DialogClose>
                                                <Button
                                                    onClick={handleSaveStep}
                                                    disabled={isSavingStep}
                                                >
                                                    {" "}
                                                    {isSavingStep ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="mr-2 h-4 w-4" />
                                                            Save Step
                                                        </>
                                                    )}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
                </>
            )}

            {/* Initial View - No process selected
            {!isLoadingDetails &&
                !currentProcess &&
                currentView === "process" &&
                !listError && (
                    <div className="text-center py-10 border rounded-md">
                        <p className="text-gray-500">Process details will appear here.</p>
                    </div>
                )} */}
        </div>
    );

    // Render correct view
    return currentView === "list"
        ? renderProcessList()
        : renderProcessManagement();
}
