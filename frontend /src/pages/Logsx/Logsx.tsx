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
import moment from 'moment'
import { apiRoute } from '@/apiRoute'

interface RepoProps {
    user: string
    detail: string
    createdAt: string
}

const columns: ColumnDef<RepoProps>[] = [
    {
        accessorKey: 'user',
        header: 'User',
    },
    {
        accessorKey: 'detail',
        header: 'Detail',
    },
    {
        accessorKey: 'createdAt',
        header: 'Created At',
    }
]

function Logsx() {
    const [data, setData] = React.useState<RepoProps[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchLogs = async () => {
            try {
                const token = localStorage.getItem("token")
                const res = await fetch(apiRoute + "/logs/all", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
                const result = await res.json()

                if (!res.ok) throw new Error(result.message || "Failed to fetch logs")

                const formatted = result.map((log: any) => ({
                    user: log.user?.name || "Unknown",
                    detail: log.description
                        ? log.description.length > 150
                            ? log.description.substring(0, 90).trim() + "..."
                            : log.description.trim()
                        : log.detail || "No description",
                    createdAt: moment(log.createdAt).format("YYYY-MM-DD hh:mm A")
                }))

                setData(formatted)
            } catch (err: any) {
                console.error(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchLogs()
    }, [])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <React.Fragment>
            <div className="rounded-md w-full gap-4 p-4">
                <h1 className='flex flex-col text-left'>
                    <span className="text-2xl font-bold">Logs</span>
                    <span className="text-sm text-gray-500">List of Logs</span>
                </h1>

                {loading ? (
                    <div className="text-center mt-10 text-sm text-gray-500">
                        Loading logs...
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
                                    <TableRow key={row.id} className='hover:bg-gray-100'>
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

export default Logsx
