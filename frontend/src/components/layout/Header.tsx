"use client";

import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-12 bg-[#161b22] border-b border-gray-700/50 flex items-center justify-between px-4 shrink-0">
      {/* Left — App name */}
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-[#209dd7] tracking-tight">
          BTP
        </span>
        <span className="text-xs text-gray-500 hidden sm:inline">
          Ban&apos;s TeaserParser
        </span>
      </div>

      {/* Right — User info + logout */}
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300">
            {user.display_name ?? user.username}
          </span>
          <span className="text-xs text-gray-500 bg-[#0d1117] border border-gray-700/50 rounded px-1.5 py-0.5 uppercase">
            {user.role}
          </span>
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-[#ff1744] transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
