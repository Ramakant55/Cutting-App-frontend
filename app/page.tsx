"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const user = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    
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
