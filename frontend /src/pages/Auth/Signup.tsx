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
import { useNavigate } from "react-router-dom"
import logo from '../../assets/logo.jpg'
import { toast } from "sonner"
import { apiRoute } from "@/apiRoute"

export default function SignupForm() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        username: "",
        password: "",
        adminPassword: "",
    })

    const navigate = useNavigate()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const payload = {
            name: formData.name,
            email: formData.email,
            username: formData.username,
            password: formData.password,
            adminpassword: formData.adminPassword // important: match backend key exactly
        }

        try {
            const res = await fetch(apiRoute + "/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            })

            const result = await res.json()

            if (res.ok) {
                toast.success(result.message || "Registration successful!")
                navigate("/login")
            } else {
                toast.error(result.message || "Registration failed")
            }
        } catch (error) {
            console.error("Signup error:", error)
            toast.error("Something went wrong. Please try again.")
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <img src={logo} alt="Logo" className="w-1/4 mx-auto mt-4" />

                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
                    <CardDescription className="text-center">
                        Enter your information to sign up
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Your Name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Your Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">Your Username</Label>
                            <Input
                                id="username"
                                name="username"
                                placeholder="Choose a username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Your Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Create a password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="adminPassword">Admin Password</Label>
                            <Input
                                id="adminPassword"
                                name="adminPassword"
                                type="password"
                                placeholder="Enter admin password"
                                value={formData.adminPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </CardContent>

                    <CardFooter>
                        <Button type="submit" className="w-full mt-5">
                            Sign up
                        </Button>
                    </CardFooter>

                    <p className="text-center mt-4 text-sm text-gray-500">
                        Already have an account?{" "}
                        <span
                            onClick={() => navigate("/login")}
                            className="text-blue-500 hover:underline cursor-pointer"
                        >
                            Sign in
                        </span>
                    </p>
                </form>
            </Card>
        </main>
    )
}
