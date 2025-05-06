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
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import moment from 'moment'
import { apiRoute } from '@/apiRoute'

interface RepoProps {
    repoName: string
    createdBy: string
    createdAt: string
    issueType: string
    id: string
}

const columns: ColumnDef<RepoProps>[] = [
    {
        accessorKey: 'repoName',
        header: 'Repository Name',
    },
    {
        accessorKey: 'createdBy',
        header: 'Created By',
    },
    {
        accessorKey: 'createdAt',
        header: 'Created at',
    },
    {
        accessorKey: 'issueType',
        header: 'Issue Type',
    },
]

function Issues() {
    const navigate = useNavigate()
    const [data, setData] = React.useState<RepoProps[]>([])
    const [searchQuery, setSearchQuery] = React.useState("")
    const [loading, setLoading] = React.useState(false)

    const fetchIssues = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(apiRoute + "/issues/all", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            const result = await res.json()

            if (!res.ok) throw new Error(result.message)

            const formatted: RepoProps[] = result.data.map((issue: any) => ({
                repoName: issue.repository?.name || 'Unknown',
                createdBy: issue.user?.username || 'Unknown',
                createdAt: moment(issue.createdAt).fromNow(),
                issueType: issue.issueType,
                id: issue.repository.id

            }))

            setData(formatted)
        } catch (err: any) {
            toast.error(err.message || "Failed to load issues")
        } finally {
            setLoading(false)
        }
    }

    const searchIssues = async (query: string) => {
        if (!query.trim()) {
            fetchIssues()
            return
        }

        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(apiRoute + `/issues/search/${query}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            const result = await res.json()

            if (!res.ok) throw new Error(result.message)

            const formatted: RepoProps[] = result.data.map((issue: any) => ({
                repoName: issue.repository?.name || 'Unknown',
                createdBy: issue.user?.username || 'Unknown',
                createdAt: moment(issue.createdAt).fromNow(),
                issueType: issue.issueType,
                id: issue.repository.id
            }))

            setData(formatted)
        } catch (err: any) {
            toast.error(err.message || "Search failed")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchIssues()
    }, [])

    React.useEffect(() => {
        const delay = setTimeout(() => {
            searchIssues(searchQuery)
        }, 500)

        return () => clearTimeout(delay)
    }, [searchQuery])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <React.Fragment>
            <div className="rounded-md w-full gap-4 p-4">
                <h1 className='flex flex-col text-left'>
                    <span className="text-2xl font-bold">Issues</span>
                    <span className="text-sm text-gray-500">
                        List of recently created issues
                    </span>
                </h1>

                <Input
                    placeholder="Search Issues"
                    className='w-2/4 mt-4'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                {loading ? (
                    <div className="text-center mt-10 text-gray-500 text-sm">
                        Loading issues...
                    </div>
                ) : (
                    <Table className='mt-7'>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className='hover:bg-gray-100 cursor-pointer'
                                        onClick={() => {
                                            navigate(`/issues/${row.original.id}`)
                                        }}
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
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </React.Fragment>
    )
}

export default Issues
