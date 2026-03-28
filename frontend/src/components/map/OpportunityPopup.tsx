"use client";

import type { Opportunity } from "@/types";

function formatPrice(v: number | null): string {
  if (v == null) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

interface Props {
  opportunity: Opportunity;
  onViewDetails?: (opp: Opportunity) => void;
}

export default function OpportunityPopup({ opportunity, onViewDetails }: Props) {
  const o = opportunity;
  return (
    <div className="min-w-[200px] text-xs leading-relaxed">
      <div className="font-semibold text-sm mb-1" style={{ color: "#209dd7" }}>
        {o.property_name ?? "Unnamed Property"}
      </div>
      <div style={{ color: "#9ca3af" }}>
        {[o.city, o.state].filter(Boolean).join(", ") || "Unknown location"}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span style={{ color: "#6b7280" }}>Price:</span>
        <span style={{ color: "#e5e7eb" }}>{formatPrice(o.asking_price)}</span>
        <span style={{ color: "#6b7280" }}>Type:</span>
        <span style={{ color: "#e5e7eb" }}>{o.property_type ?? "N/A"}</span>
        <span style={{ color: "#6b7280" }}>Status:</span>
        <span style={{ color: "#e5e7eb", textTransform: "capitalize" }}>{o.status}</span>
        <span style={{ color: "#6b7280" }}>Votes:</span>
        <span style={{ color: o.vote_score > 0 ? "#00c853" : o.vote_score < 0 ? "#ff1744" : "#e5e7eb" }}>
          {o.vote_score > 0 ? "+" : ""}{o.vote_score}
        </span>
      </div>
      {o.cap_rate != null && (
        <div className="mt-1">
          <span style={{ color: "#6b7280" }}>Cap Rate: </span>
          <span style={{ color: "#e5e7eb" }}>{o.cap_rate.toFixed(2)}%</span>
        </div>
      )}
      {onViewDetails && (
        <button
          onClick={() => onViewDetails(o)}
          className="mt-2 w-full py-1 rounded text-xs font-medium"
          style={{ backgroundColor: "#753991", color: "#fff" }}
        >
          View Details
        </button>
      )}
    </div>
  );
}
