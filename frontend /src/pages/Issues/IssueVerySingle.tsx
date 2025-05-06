import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare } from 'lucide-react'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import moment from 'moment'
import { apiRoute } from '@/apiRoute'

function IssueVerySingle() {
    const navigate = useNavigate()
    const { issueId } = useParams()
    const [newComment, setNewComment] = React.useState('')
    const [issue, setIssue] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchIssue = async () => {
            try {
                const token = localStorage.getItem("token")
                const res = await fetch(apiRoute + `/issues/issue/${issueId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                const result = await res.json()

                if (!res.ok) throw new Error(result.message)

                setIssue(result.data)
            } catch (err: any) {
                toast.error(err.message || "Failed to load issue")
            } finally {
                setLoading(false)
            }
        }

        fetchIssue()
    }, [issueId])

    const handleSubmitComment = async () => {
        if (!newComment.trim()) return

        try {
            const token = localStorage.getItem("token")
            const res = await fetch(apiRoute + `/issues/comment/${issueId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ comment: newComment })
            })

            const result = await res.json()

            if (!res.ok) throw new Error(result.message)

            const newCommentObj = {
                id: Math.random().toString(36).substr(2, 9),
                description: newComment,
                createdAt: new Date().toISOString(),
                user: {
                    username: "You"
                }
            }

            setIssue((prev: any) => ({
                ...prev,
                comment: [...prev.comment, newCommentObj]
            }))

            setNewComment('')
        } catch (err: any) {
            toast.error(err.message || "Failed to post comment")
        }
    }

    if (loading) return <p className="p-4 text-gray-600">Loading...</p>
    if (!issue) return <p className="p-4 text-gray-600">Issue not found.</p>

    return (
        <div className="container mx-auto py-6 px-5">
            <Button
                variant="ghost"
                className="mb-4 flex items-center gap-1 text-gray-600"
                onClick={() => navigate(-1)}
            >
                ← Back to issues
            </Button>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-2xl font-bold">{issue.title}</h1>
                        <span className="text-gray-500">#{issue.id.slice(-5)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            className="capitalize"
                        >
                            {issue.status.toLowerCase()}
                        </Badge>
                        <span className="text-sm text-gray-600">
                            <span className="font-medium">{issue.user?.username}</span> opened this issue {moment(issue.createdAt).fromNow()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                    {/* Issue description */}
                    <div className="border rounded-md p-4 mb-6">
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                            {issue.description}
                        </div>
                    </div>

                    {/* Comments */}
                    <div className="mb-6">
                        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                            <MessageSquare size={18} />
                            Comments ({issue.comment?.length || 0})
                        </h2>

                        {issue.comment?.length ? issue.comment.map((comment: any) => (
                            <div key={comment.id} className="border rounded-md p-4 mb-4">
                                <div className="flex items-start gap-3">

                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-medium">{comment.user?.username}</h3>
                                            <span className="text-sm text-gray-500">
                                                {moment(comment.createdAt).fromNow()}
                                            </span>
                                        </div>
                                        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                                            {comment.description}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-gray-500">No comments yet.</p>
                        )}
                    </div>

                    {/* New comment */}
                    <div className="border rounded-md p-4">
                        <h2 className="text-lg font-medium mb-3">Add a comment</h2>
                        <Textarea
                            className="min-h-32 mb-3"
                            placeholder="Leave a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <div className="flex justify-end">
                            <Button onClick={handleSubmitComment}>Submit</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default IssueVerySingle
