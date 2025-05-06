import React, { useEffect, useState } from 'react'
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    ColumnDef,
} from '@tanstack/react-table'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from '@radix-ui/react-label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import moment from 'moment'
import { apiRoute } from '@/apiRoute'

interface RepoProps {
    repoName: string
    createdBy: string
    lastUpdated: string
    Language: string
}

const columns: ColumnDef<RepoProps>[] = [
    { accessorKey: 'repoName', header: 'Repository Name' },
    { accessorKey: 'createdBy', header: 'Created By' },
    { accessorKey: 'lastUpdated', header: 'Last Updated' },
    { accessorKey: 'Language', header: 'Language' }
]

const topLanguages = [
    { label: 'JCL', value: 'JCL' },
    { label: 'PL/I', value: 'PL/I' },
    { label: 'RPG', value: 'RPG' },
    { label: 'COBOL', value: 'COBOL' },
    { label: 'Assembly', value: 'Assembly' },
    { label: 'Fortran', value: 'Fortran' },
    { label: 'Delphi/Object Pascal', value: 'Delphi/Object Pascal' },
    { label: 'JavaScript', value: 'JavaScript' },
    { label: 'Python', value: 'Python' },
    { label: 'Java', value: 'Java' },
    { label: 'C#', value: 'C#' },
    { label: 'C++', value: 'C++' },
    { label: 'TypeScript', value: 'TypeScript' },
    { label: 'Rust', value: 'Rust' },
    { label: 'Go', value: 'Go' },
    { label: 'Ruby', value: 'Ruby' },
    { label: 'PHP', value: 'PHP' },
    { label: 'Swift', value: 'Swift' },
    { label: 'Kotlin', value: 'Kotlin' },
    { label: 'Scala', value: 'Scala' },
    { label: 'Objective-C', value: 'Objective-C' },
    { label: 'Perl', value: 'Perl' },
    { label: 'Haskell', value: 'Haskell' },
    { label: 'Dart', value: 'Dart' },
    { label: 'Elixir', value: 'Elixir' },
    { label: 'Clojure', value: 'Clojure' },
    { label: 'Lua', value: 'Lua' },
    { label: 'F#', value: 'F#' },
    { label: 'Erlang', value: 'Erlang' },
    { label: 'R', value: 'R' },
    { label: 'MATLAB', value: 'MATLAB' },
    { label: 'Groovy', value: 'Groovy' },
    { label: 'Visual Basic .NET', value: 'Visual Basic .NET' },
    { label: 'Ada', value: 'Ada' },
    { label: 'VHDL', value: 'VHDL' },
    { label: 'Verilog', value: 'Verilog' },
    { label: 'Shell', value: 'Shell' },
    { label: 'PowerShell', value: 'PowerShell' },
    { label: 'Tcl', value: 'Tcl' },
    { label: 'Smalltalk', value: 'Smalltalk' },
    { label: 'Prolog', value: 'Prolog' },
    { label: 'Lisp', value: 'Lisp' },
    { label: 'Scheme', value: 'Scheme' },
    { label: 'Julia', value: 'Julia' },
    { label: 'Nim', value: 'Nim' },
    { label: 'Crystal', value: 'Crystal' },
    { label: 'Zig', value: 'Zig' },
    { label: 'Solidity', value: 'Solidity' },
    { label: 'Hack', value: 'Hack' },
    { label: 'ABAP', value: 'ABAP' },
    { label: 'Q#', value: 'Q#' },
    { label: 'VBScript', value: 'VBScript' },
    { label: 'ActionScript', value: 'ActionScript' },
    { label: 'Awk', value: 'Awk' }
];

function Repo() {
    const navigate = useNavigate()
    const [showCreateRepoDialog, setShowCreateRepoDialog] = useState(false)
    const [repos, setRepos] = useState<RepoProps[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const [newRepo, setNewRepo] = useState({
        reponame: '',
        description: '',
        language: ''
    })

    const fetchRepos = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            if (!token) throw new Error("Authentication token not found")

            const res = await fetch(apiRoute + "/repo/getall", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            })

            const result = await res.json()

            if (!res.ok) throw new Error(result.message || "Failed to fetch repositories")

            const formatted = result.data.map((repo: any) => ({
                repoName: repo.name,
                createdBy: repo.user?.name || repo.user?.username || 'Unknown',
                lastUpdated: moment(repo.updatedAt).format('YYYY-MM-DD hh:mm A'),
                Language: repo.language || "Not specified"
            }))

            setRepos(formatted)
        } catch (err: any) {
            setError(err.message)
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const searchRepos = async (query: string) => {
        if (!query) {
            fetchRepos()
            return
        }

        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            if (!token) throw new Error("Authentication token not found")

            const res = await fetch(apiRoute + `/repo/search/${query}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",

                }
            })

            const result = await res.json()

            if (!res.ok) throw new Error(result.message || "Failed to search repositories")

            const formatted = result.data.map((repo: any) => ({
                repoName: repo.name,
                createdBy: repo.user?.name || repo.user?.username || 'Unknown',
                lastUpdated: moment(repo.updatedAt).format('YYYY-MM-DD hh:mm A'),
                Language: repo.language || "Not specified"
            }))

            setRepos(formatted)
        } catch (err: any) {
            setError(err.message)
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRepos()
    }, [])

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            searchRepos(searchQuery)
        }, 500) // Debounce

        return () => clearTimeout(delayDebounce)
    }, [searchQuery])

    const handleCreateRepo = async () => {
        try {
            const token = localStorage.getItem("token")
            if (!token) throw new Error("Authentication token not found")

            const res = await fetch(apiRoute + "/repo/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(newRepo)
            })

            const result = await res.json()
            if (result.code != 200) {
                toast.error(result.message || "Failed to create repository")
                return
            }
            toast.success(result.message || "Repository created successfully", {
                position: "top-center",
            })
            setShowCreateRepoDialog(false)
            setNewRepo({ reponame: '', description: '', language: '' })
            fetchRepos()
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    const table = useReactTable({
        data: repos,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <>
            {/* Dialog */}
            <Dialog open={showCreateRepoDialog} onOpenChange={setShowCreateRepoDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create a new repo</DialogTitle>
                        <DialogDescription>
                            You can create a new repository here. Please provide the necessary details.
                        </DialogDescription>

                        <div className="mt-2 space-y-4">
                            <div>
                                <Label htmlFor="repo">Repository Name</Label>
                                <Input
                                    id="repo"
                                    value={newRepo.reponame}
                                    onChange={(e) =>
                                        setNewRepo((prev) => ({ ...prev, reponame: e.target.value }))
                                    }
                                />
                            </div>

                            <div>
                                <Label htmlFor="description">Short Description</Label>
                                <Textarea
                                    id="description"
                                    className='resize-none'
                                    value={newRepo.description}
                                    onChange={(e) =>
                                        setNewRepo((prev) => ({ ...prev, description: e.target.value }))
                                    }
                                />
                            </div>

                            <div>
                                <Label htmlFor="language">Language</Label>
                                <Select
                                    value={newRepo.language}
                                    onValueChange={(val) =>
                                        setNewRepo((prev) => ({ ...prev, language: val }))
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {topLanguages.map((lang) => (
                                            <SelectItem key={lang.value} value={lang.value}>
                                                {lang.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button className='w-full' onClick={handleCreateRepo}>
                                Create Repository
                            </Button>
                        </div>
                    </DialogHeader>
                </DialogContent>
            </Dialog>

            {/* Page Content */}
            <div className="rounded-md w-full gap-4 p-4">
                <h1 className='flex flex-col text-left'>
                    <span className="text-2xl font-bold">Repositories</span>
                    <span className="text-sm text-gray-500">List of repositories</span>
                </h1>

                <div className="flex flex-row justify-between items-center mt-4">
                    <Input
                        placeholder="Search Repositories"
                        className='w-2/4 mt-4'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button
                        variant='default'
                        className='mt-4'
                        onClick={() => setShowCreateRepoDialog(true)}
                    >
                        Create Repository
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center mt-10 text-sm text-gray-500">Loading repositories...</div>
                ) : error ? (
                    <div className="text-center mt-10 text-red-500">{error}</div>
                ) : (
                    <Table className='mt-7'>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>

                        <TableBody>
                            {table.getRowModel().rows.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className='hover:bg-gray-100 cursor-pointer'
                                        onClick={() => navigate(`/repositories/${row.original.repoName}`)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        No repositories found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </>
    )
}

export default Repo
