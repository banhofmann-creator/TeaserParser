"use client";

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import LoginForm from "@/components/auth/LoginForm";
import AppShell from "@/components/layout/AppShell";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-[#209dd7] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return <AppShell />;
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
