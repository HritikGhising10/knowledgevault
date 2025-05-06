import { Button } from '@/components/ui/button'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import moment from 'moment'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { apiRoute } from '@/apiRoute'

function RepositoryIssues() {
    const navigate = useNavigate()
    const { id } = useParams()

    const [issues, setIssues] = React.useState<any[]>([])
    const [repoName, setRepoName] = React.useState<string>("")
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchIssues = async () => {
            try {
                const token = localStorage.getItem("token")
                const res = await fetch(apiRoute + `/issues/repo/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                const result = await res.json()

                if (!res.ok) throw new Error(result.message)

                setIssues(result.data.issues)
                setRepoName(result.data.reponame)
            } catch (err: any) {
                toast.error(err.message || "Failed to load issues")
            } finally {
                setLoading(false)
            }
        }

        fetchIssues()
    }, [id])

    return (
        <React.Fragment>
            <div className="w-full mt-5">
                <div className="w-full p-4 mb-4">
                    <h1 className="text-2xl font-bold mb-6">
                        {issues.length} Issues in {repoName || id}
                    </h1>

                    {loading ? (
                        <p className="text-sm text-gray-500">Loading issues...</p>
                    ) : issues.length === 0 ? (
                        <p className="text-sm text-gray-500">No issues found.</p>
                    ) : (
                        issues.map((issue) => (
                            <div
                                key={issue.id}
                                className="border p-4 rounded-md mb-3 hover:bg-gray-50 cursor-pointer"
                                onClick={() => navigate(`/issues/${id}/${issue.id}`)}

                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-800">
                                            {issue.title}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            #{issue.id.slice(-5)} opened {moment(issue.createdAt).fromNow()} by {issue.user?.username || 'unknown'}
                                        </p>
                                    </div>
                                    <Badge
                                        className="capitalize"
                                    >
                                        {issue.status}
                                    </Badge>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </React.Fragment>
    )
}

export default RepositoryIssues
