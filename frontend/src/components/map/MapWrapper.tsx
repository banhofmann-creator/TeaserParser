"use client";

import dynamic from "next/dynamic";
import type { Opportunity } from "@/types";

const OpportunityMap = dynamic(() => import("./OpportunityMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0d1117]">
      <div className="text-center">
        <div className="inline-block w-6 h-6 border-2 border-[#209dd7] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    </div>
  ),
});

interface Props {
  opportunities: Opportunity[];
  onViewDetails?: (opp: Opportunity) => void;
}

export default function MapWrapper({ opportunities, onViewDetails }: Props) {
  return (
    <div className="flex-1 relative">
      <OpportunityMap opportunities={opportunities} onViewDetails={onViewDetails} />
    </div>
  );
}
