"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginForm() {
  const { login, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setLocalError("Username and password are required");
      return;
    }
    setLocalError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch {
      // error is set in the auth context
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError ?? error;

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#209dd7] tracking-tight">
            BTP
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Ban&apos;s TeaserParser
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#161b22] border border-gray-700/50 rounded-lg p-6 space-y-4"
        >
          {/* Error */}
          {displayError && (
            <div className="bg-[#ff1744]/10 border border-[#ff1744]/30 text-[#ff1744] text-sm rounded px-3 py-2">
              {displayError}
            </div>
          )}

          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#209dd7] focus:ring-1 focus:ring-[#209dd7]/30 transition-colors"
              placeholder="Enter username"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#209dd7] focus:ring-1 focus:ring-[#209dd7]/30 transition-colors"
              placeholder="Enter password"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#753991] hover:bg-[#8a45a8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded px-4 py-2.5 transition-colors"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-4">
          AI-powered real estate opportunity parser
        </p>
      </div>
    </div>
  );
}
