"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!userId) {
      router.push('/register');
    }
  }, [userId, router]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch("https://kdm-cuttingapp.onrender.com/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          otp,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "OTP verification failed");
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

  const handleResendOTP = async () => {
    try {
      setResendDisabled(true);
      setCountdown(60); // 60 seconds countdown
      
      const response = await fetch("https://kdm-cuttingapp.onrender.com/api/auth/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to resend OTP");
      }
    } catch (err) {
      setError(err.message);
      setResendDisabled(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4 md:px-0">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Verify Email</CardTitle>
          <CardDescription className="text-center">
            Enter the OTP sent to your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  required
                />
              </div>
              
              {error && <p className="text-red-500 text-sm">{error}</p>}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>
              
              <div className="text-center">
                <Button 
                  type="button" 
                  variant="link" 
                  onClick={handleResendOTP}
                  disabled={resendDisabled}
                  className="text-sm"
                >
                  {resendDisabled 
                    ? `Resend OTP in ${countdown} seconds` 
                    : "Didn't receive the OTP? Resend"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            <Button 
              variant="link"
              className="p-0 h-auto"
              onClick={() => router.push('/login')}
            >
              Back to Login
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyOTP() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <VerifyOTPContent />
    </Suspense>
  );
}
