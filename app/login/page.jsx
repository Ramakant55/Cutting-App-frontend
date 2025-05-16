"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch("https://kdm-cuttingapp.onrender.com/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Check if account is not verified
        if (data.data && data.data.userId) {
          // Redirect to OTP verification
          return router.push(`/verify-otp?userId=${data.data.userId}`);
        }
        throw new Error(data.error || "Login failed");
      }

      // Store token in localStorage with try-catch for webview compatibility
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch (storageErr) {
        console.warn("Unable to access localStorage:", storageErr);
        // You could implement an alternative storage method here if needed
        // For example, using sessionStorage, cookies, or state management
      }
      
      // Navigate to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4 md:px-0">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Login</CardTitle>
            {/* Help button that works on both hover (desktop) and tap (mobile) */}
            <div className="relative group">
              <button 
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 focus:text-blue-800 focus:outline-none" 
                aria-label="Help"
                onClick={() => {/* Handle click for mobile devices */}}
              >
                <HelpCircle className="h-5 w-5 mr-1" />
                <span>Help</span>
              </button>
              
              {/* Help popup that shows on hover (desktop) and tap (mobile) */}
              <div className="absolute right-0 top-full mt-2 hidden group-hover:block group-focus-within:block z-10 bg-white p-3 shadow-lg rounded-lg border min-w-[200px]">
                <div className="flex flex-col gap-1">
                  <div className="font-semibold">Need assistance?</div>
                  <a 
                    href="tel:9828784436" 
                    className="flex items-center text-gray-700 hover:text-blue-600"
                    aria-label="Call 9828784436 for help"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    <span className="underline">9828784436</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <CardDescription>
            Log in to access your number tracker
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              {error && <p className="text-red-500 text-sm">{error}</p>}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Log in"}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Don't have an account?{" "}
            <a 
              href="/register" 
              className="text-blue-600 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                router.push("/register");
              }}
            >
              Register
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
