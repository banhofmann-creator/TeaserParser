"use client";

import { useState } from "react";
import type { ViewId, Opportunity } from "@/types";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { useOpportunities } from "@/hooks/useOpportunities";
import MapWrapper from "@/components/map/MapWrapper";
import OpportunityTable from "@/components/opportunities/OpportunityTable";
import OpportunityDetail from "@/components/opportunities/OpportunityDetail";
import PowerBIDashboard from "@/components/dashboard/PowerBIDashboard";
import FileManager from "@/components/documents/FileManager";
import UploadZone from "@/components/documents/UploadZone";
import ChatPanel from "@/components/chat/ChatPanel";

// ── App Shell ────────────────────────────────────────

export default function AppShell() {
  const [activeView, setActiveView] = useState<ViewId>("map");
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  const { opportunities, loading, filters, setFilters } = useOpportunities();

  function handleSelectOpp(opp: Opportunity) {
    setSelectedOpp(opp);
    setActiveView("table");
  }

  function renderContent() {
    // If an opportunity is selected in table view, show detail
    if (activeView === "table" && selectedOpp) {
      return (
        <OpportunityDetail
          opportunity={selectedOpp}
          onBack={() => setSelectedOpp(null)}
        />
      );
    }

    switch (activeView) {
      case "map":
        if (loading) return <LoadingView />;
        return (
          <MapWrapper
            opportunities={opportunities}
            onViewDetails={handleSelectOpp}
          />
        );

      case "table":
        if (loading) return <LoadingView />;
        return (
          <OpportunityTable
            opportunities={opportunities}
            onSelect={(opp) => setSelectedOpp(opp)}
            filters={{ status: filters.status, property_type: filters.property_type }}
            onFiltersChange={(f) => setFilters({ ...filters, ...f })}
          />
        );

      case "dashboard":
        return <PowerBIDashboard />;

      case "documents":
        return <FileManager />;

      case "upload":
        return <UploadZone />;

      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-gray-200">
      {/* Header */}
      <Header />

      {/* Body: Sidebar + Main + Chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          onNavigate={(v) => {
            setActiveView(v);
            if (v !== "table") setSelectedOpp(null);
          }}
        />

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-auto bg-[#0d1117]">
          {renderContent()}
        </main>

        {/* Chat panel */}
        <aside
          className={`${
            chatOpen ? "w-[320px]" : "w-0"
          } bg-[#161b22] border-l border-gray-700/50 transition-all duration-200 overflow-hidden shrink-0 flex flex-col`}
        >
          {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
        </aside>

        {/* Chat toggle (when collapsed) */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="w-10 bg-[#161b22] border-l border-gray-700/50 flex items-center justify-center shrink-0 hover:bg-[#1c2129] transition-colors"
            title="Open AI Chat"
          >
            <span className="text-[#209dd7] text-lg">&#x1F4AC;</span>
          </button>
        )}
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-6 h-6 border-2 border-[#209dd7] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
