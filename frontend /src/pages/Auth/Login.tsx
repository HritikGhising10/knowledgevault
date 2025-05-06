import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card"
import logo from '../../assets/logo.jpg'
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { apiRoute } from "@/apiRoute"

export default function LoginForm() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const res = await fetch(apiRoute + "/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, password })
            })

            const result = await res.json()

            if (res.ok) {
                toast.success(result.message || "Login successful")
                localStorage.setItem("token", result.data.token)
                window.location.reload()
            } else {
                toast.error(result.message || "Login failed")
            }
        } catch (error) {
            console.error("Login error:", error)
            toast.error("Something went wrong. Please try again.")
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <img src={logo} alt="App Logo" className="w-1/4 mx-auto mt-4" />

                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
                    <CardDescription className="text-center">
                        Welcome to Knowledge Vault <br /> Please enter your credentials to continue.
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>

                    <CardFooter>
                        <Button type="submit" className="w-full mt-5">
                            Sign in
                        </Button>
                    </CardFooter>

                    <p className="text-center mt-4 text-sm text-gray-500">
                        Don't have an account?{" "}
                        <span
                            onClick={() => navigate("/signup")}
                            className="text-blue-500 hover:underline cursor-pointer"
                        >
                            Signup
                        </span>
                    </p>
                </form>
            </Card>
        </main>
    )
}
