"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    if (token && user) {
      // If user is already logged in, redirect to dashboard
      router.push("/dashboard");
    } else {
      // Otherwise redirect to login page
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Loading...</h1>
        <p>Please wait while we redirect you.</p>
      </div>
    </div>
  );
}
