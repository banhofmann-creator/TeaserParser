"use client";

import type { ViewId } from "@/types";

interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "map", label: "Map", icon: "\u{1F5FA}" },
  { id: "table", label: "Table", icon: "\u{1F4CA}" },
  { id: "dashboard", label: "Dashboard", icon: "\u{1F4C8}" },
  { id: "documents", label: "Documents", icon: "\u{1F4C2}" },
  { id: "upload", label: "Upload", icon: "\u{2B06}" },
];

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
}

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <nav className="w-[200px] bg-[#161b22] border-r border-gray-700/50 flex flex-col shrink-0">
      {/* Nav items */}
      <div className="flex flex-col py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                isActive
                  ? "text-[#209dd7] bg-[#209dd7]/10 border-r-2 border-[#209dd7]"
                  : "text-gray-400 hover:text-gray-200 hover:bg-[#0d1117]/50"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom spacer */}
      <div className="flex-1" />

      {/* Version / info */}
      <div className="px-4 py-3 border-t border-gray-700/50">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">
          BTP v0.1.0
        </p>
      </div>
    </nav>
  );
}
