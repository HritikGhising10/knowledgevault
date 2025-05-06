import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { BugIcon, DownloadIcon, FileIcon, PlusIcon, Trash } from 'lucide-react'
import { Drawer } from 'vaul'
import { toast } from 'sonner'
import { VIEWABLE_TEXT_EXTENSIONS } from '@/utils/viewableExtensions'
import ReactMarkdown from 'react-markdown'
import { apiRoute } from '@/apiRoute'

function RepoPage() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [repoData, setRepoData] = React.useState<any>(null)
    const [selectedFile, setSelectedFile] = React.useState<any>(null)
    const [fileContent, setFileContent] = React.useState<string>("")
    const [isPreviewable, setIsPreviewable] = React.useState(true)
    const [loading, setLoading] = React.useState(true)

    const [uploadFile, setUploadFile] = React.useState<File | null>(null)
    const [uploadName, setUploadName] = React.useState<string>("")
    const [uploadDescription, setUploadDescription] = React.useState<string>("")

    const [issueTitle, setIssueTitle] = React.useState("")
    const [issueType, setIssueType] = React.useState("")
    const [issueDescription, setIssueDescription] = React.useState("")

    const [documentationContent, setDocumentationContent] = React.useState("")
    const [showDocumentationViewer, setShowDocumentationViewer] = React.useState(false)
    const [showDocumentationUpdateDialog, setShowDocumentationUpdateDialog] = React.useState(false)

    const [showDialog, setShowDialog] = React.useState(false)
    const [showIssueDialog, setShowIssueDialog] = React.useState(false)
    const [showCreateIssueDialog, setShowCreateIssueDialog] = React.useState(false)


    const [showAIDrawer, setShowAIDrawer] = React.useState(false)
    const [aiLoading, setAiLoading] = React.useState(false)
    const [aiResponse, setAiResponse] = React.useState("")

    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        const fetchRepo = async () => {
            try {
                const token = localStorage.getItem("token")
                const res = await fetch(apiRoute + `/repo/get/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const result = await res.json()

                if (!res.ok) throw new Error(result.message || "Failed to load repository")

                setRepoData(result.data)
                setDocumentationContent(result.data.documentation || "")
            } catch (err: any) {
                toast.error(err.message || "Error loading repository")
            } finally {
                setLoading(false)
            }
        }

        fetchRepo()
    }, [id])

    const handleFileClick = async (file: any) => {
        setSelectedFile(file)
        setOpen(true)

        const ext = file.type?.toLowerCase()
        if (ext && VIEWABLE_TEXT_EXTENSIONS.includes(ext)) {
            setIsPreviewable(true)
            try {
                const token = localStorage.getItem("token")
                const res = await fetch(apiRoute + `/${file.path}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                const text = await res.text()
                setFileContent(text)
            } catch {
                setFileContent('Error loading file content.')
            }
        } else {
            setIsPreviewable(false)
            setFileContent('')
        }
    }

    const handleUpload = async () => {
        if (!uploadFile || !uploadName || !uploadDescription) {
            toast.error("All fields are required")
            return
        }

        try {
            const token = localStorage.getItem("token")
            const formData = new FormData()
            formData.append("file", uploadFile)
            formData.append("filename", uploadName)
            formData.append("description", uploadDescription)

            const res = await fetch(apiRoute + `/repo/addfile/${id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.message)

            toast.success(result.message || "Upload successful")
            setShowDialog(false)
            window.location.reload()
        } catch (err: any) {
            toast.error(err.message || "Failed to upload")
        }
    }

    const handleCreateIssue = async () => {
        if (!issueTitle || !issueType || !issueDescription) {
            toast.error("All fields are required")
            return
        }

        try {
            const token = localStorage.getItem("token")
            const res = await fetch(apiRoute + "/issues/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: issueTitle,
                    issue_type: issueType,
                    description: issueDescription,
                    repoid: repoData.id
                })
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.message)

            toast.success(result.message || "Issue created successfully")
            setShowCreateIssueDialog(false)
            setIssueTitle("")
            setIssueType("")
            setIssueDescription("")
        } catch (err: any) {
            toast.error(err.message || "Failed to create issue")
        }
    }

    const handleAskAI = async () => {
        try {
            setAiLoading(true)
            setShowAIDrawer(true)

            const token = localStorage.getItem("token")
            const res = await fetch(apiRoute + `/repo/askai/${repoData.name}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.message)

            setAiResponse(result.data || "No response received.")
        } catch (err: any) {
            toast.error(err.message || "Failed to get AI response")
            setAiResponse("Something went wrong while generating the AI response.")
        } finally {
            setAiLoading(false)
        }
    }


    const handleUpdateDocumentation = async () => {
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(apiRoute + `/repo/adddocumentation/${id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ documentation: documentationContent })
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.message)

            toast.success(result.message || "Documentation updated successfully")
            setShowDocumentationUpdateDialog(false)
        } catch (err: any) {
            toast.error(err.message || "Failed to update documentation")
        }
    }

    return (
        <React.Fragment>


            {/* ai */}
            <Drawer.Root open={showAIDrawer} onOpenChange={setShowAIDrawer} direction="right">
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-20" />
                    <Drawer.Content className="bg-white w-[90%] max-w-3xl h-full fixed top-0 right-0 z-50 shadow-lg">
                        <div className="p-6 overflow-y-auto h-full">
                            <h2 className="text-2xl font-bold mb-1">🤖 AI Assistant</h2>
                            <p className="text-sm text-gray-500 mb-4">
                                Here's an AI-generated overview and suggestions for your repository.
                            </p>

                            {aiLoading ? (
                                <p className="text-sm text-gray-400 italic">
                                    Loading AI response...
                                </p>
                            ) : (
                                <div className="prose max-w-none">
                                    <ReactMarkdown>{aiResponse}</ReactMarkdown>
                                </div>

                            )}
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* View Markdown */}

            <Drawer.Root open={showDocumentationViewer} onOpenChange={setShowDocumentationViewer} direction="right">
                <Drawer.Trigger className="hidden" /> {/* optional trigger */}
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-20" />
                    <Drawer.Content className="bg-white w-[90%] h-full fixed top-0 right-0 z-50 shadow-lg">
                        <div className="p-6 overflow-y-auto h-full">
                            <h2 className="text-2xl font-bold mb-1">📘 Documentation</h2>
                            <p className="text-sm text-gray-500 mb-4">This is the repository documentation</p>
                            <div className="prose max-w-none">
                                <ReactMarkdown>{documentationContent}</ReactMarkdown>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>









            {/* Update Markdown */}
            <Dialog open={showDocumentationUpdateDialog} onOpenChange={setShowDocumentationUpdateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Documentation</DialogTitle>
                        <DialogDescription>Write markdown content to describe your repository</DialogDescription>
                    </DialogHeader>
                    <Textarea className="h-80" value={documentationContent} onChange={(e) => setDocumentationContent(e.target.value)} />
                    <Button className="w-full mt-3" onClick={handleUpdateDocumentation}>Update</Button>
                </DialogContent>
            </Dialog>



            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload a new file</DialogTitle>
                        <DialogDescription>You are about to upload a new file.</DialogDescription>
                        <div className="flex flex-col gap-3 mt-4">
                            <Label>File Name</Label>
                            <Input placeholder="Enter file name" value={uploadName} onChange={(e) => setUploadName(e.target.value)} />
                            <Label>Description</Label>
                            <Textarea placeholder="Enter file description" className='h-40' value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} />
                            <Label>Choose file</Label>
                            <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                            <Button className="mt-4" onClick={handleUpload}>Upload</Button>
                        </div>
                    </DialogHeader>
                </DialogContent>
            </Dialog>

            {/* Issue Dialog */}
            <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Issues</DialogTitle>
                        <DialogDescription>Create or view issues</DialogDescription>
                        <div className="flex gap-2 mt-4">
                            <Button className="w-1/2" onClick={() => navigate(`/issues/${repoData.id}`)}>View Issues</Button>
                            <Button className="w-1/2" onClick={() => {
                                setShowIssueDialog(false)
                                setShowCreateIssueDialog(true)
                            }}>Create Issue</Button>
                        </div>
                    </DialogHeader>
                </DialogContent>
            </Dialog>

            {/* Create Issue Dialog */}
            <Dialog open={showCreateIssueDialog} onOpenChange={setShowCreateIssueDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create an issue</DialogTitle>
                        <DialogDescription>Describe the issue you are facing</DialogDescription>
                        <div className="flex flex-col gap-3 mt-4">
                            <Label>Title</Label>
                            <Input placeholder="Issue title" value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} />
                            <Label>Issue Type</Label>
                            <Select value={issueType} onValueChange={setIssueType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BUG">Bug</SelectItem>
                                    <SelectItem value="FEATURE">Feature</SelectItem>
                                    <SelectItem value="TASK">Task</SelectItem>
                                    <SelectItem value="IMPROVEMENT">Improvement</SelectItem>
                                    <SelectItem value="CRITICAL">Critical</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <Label>Description</Label>
                            <Textarea className="h-40" placeholder="Detailed issue description" value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} />
                            <Button className="mt-4" onClick={handleCreateIssue}>Create Issue</Button>
                        </div>
                    </DialogHeader>
                </DialogContent>
            </Dialog>

            {/* File Drawer */}
            <Drawer.Root direction="right" open={open} onOpenChange={setOpen} handleOnly>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-20" />
                    <Drawer.Content className="bg-white w-[90%] h-full fixed bottom-0 right-0 z-50">
                        {selectedFile && (
                            <>
                                <div className="flex items-center justify-between p-4 border-b">
                                    <div>
                                        <h3 className="text-lg font-semibold">{selectedFile.name}</h3>
                                        <p className="text-sm text-gray-500">Last updated {new Date(selectedFile.updatedAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="destructive" className="flex items-center gap-2">
                                            <Trash className="w-4" />
                                            Delete
                                        </Button>
                                        <a href={`/${selectedFile.path}`} download>
                                            <Button variant="outline" className="flex items-center gap-2">
                                                <DownloadIcon className="w-4" />
                                                Download
                                            </Button>
                                        </a>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-gray-600 mb-2">
                                        <span className="font-semibold text-gray-800">Description:</span>{' '}
                                        {selectedFile?.description || 'No description provided.'}
                                    </p>

                                    <div className="text-sm font-mono whitespace-pre-wrap select-text border rounded p-3 bg-gray-50 mt-2 overflow-auto h-[calc(100vh-130px)]">
                                        {isPreviewable ? (
                                            <>{fileContent}</>
                                        ) : (
                                            <p className="italic text-gray-400">This file cannot be previewed.</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Repo Header */}
            <div className="flex justify-between items-center p-4">
                <div>
                    <h1 className="text-2xl font-bold">{repoData?.name || id}</h1>
                    <p className="text-sm text-gray-500">by {
                        repoData?.user?.name || 'Unknown User'
                    }</p>
                </div>
                <div className="flex gap-2">
                    <Button className="flex items-center gap-2" onClick={handleAskAI}>
                        Ask AI
                    </Button>

                    <Button className="flex items-center gap-2" onClick={() => setShowIssueDialog(true)}>
                        <BugIcon className="w-4" />
                        Issue ({repoData?.issue?.length || 0})
                    </Button>
                </div>
            </div>

            <hr />

            {/* Files Section */}
            <div className="flex p-4 gap-4">
                <div className="w-2/3 border rounded">
                    <div className="flex justify-between items-center bg-gray-50 p-3 border-b">
                        <h4 className="text-md font-semibold text-gray-800">
                            Files <span className="text-sm text-gray-500">({repoData?.files?.length || 0})</span>
                        </h4>
                        <Button variant="outline" onClick={() => setShowDialog(true)}>
                            <PlusIcon className="w-4 mr-1" /> Add File
                        </Button>
                    </div>
                    <div className="p-2">
                        {repoData?.files?.map((file: any) => (
                            <div
                                key={file.id}
                                className="flex justify-between p-3 border-b cursor-pointer hover:bg-gray-50"
                                onClick={() => handleFileClick(file)}
                            >
                                <div className="flex items-center gap-2">
                                    <FileIcon className="w-4" />
                                    <span className="text-sm font-semibold text-blue-700 hover:underline">
                                        {file.name}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500">
                                    {new Date(file.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                        {!repoData?.files?.length && (
                            <div className="p-3 text-center text-sm text-gray-500">No files found.</div>
                        )}
                    </div>
                </div>

                {/* About Section */}

                <div className="w-1/3 p-2 ">
                    <h3 className="text-md font-semibold mb-2 text-gray-800">Documentation</h3>
                    <p className='text-sm text-gray-600 mb-2'>
                        Add documentation for your repository to help others understand how to use it.
                    </p>
                    <div className="flex gap-2 mt-6">
                        <Button className='w-2/4' onClick={() => setShowDocumentationViewer(true)}>View Documentation</Button>
                        <Button className='w-2/4' onClick={() => setShowDocumentationUpdateDialog(true)}>Update</Button>
                    </div>
                </div>
            </div>
        </React.Fragment>
    )
}

export default RepoPage
