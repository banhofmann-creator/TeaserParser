"use client";

import { useState } from "react";
import type { Opportunity } from "@/types";
import VoteButtons from "./VoteButtons";
import CommentSection from "./CommentSection";
import ProgressSection from "./ProgressSection";
import DocumentList from "../documents/DocumentList";

function formatPrice(v: number | null): string {
  if (v == null) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function formatPct(v: number | null): string {
  if (v == null) return "N/A";
  return `${v.toFixed(2)}%`;
}

function formatSqft(v: number | null): string {
  if (v == null) return "N/A";
  return new Intl.NumberFormat("en-US").format(v) + " sqft";
}

type Tab = "details" | "documents" | "comments" | "progress";

interface Props {
  opportunity: Opportunity;
  onBack: () => void;
}

export default function OpportunityDetail({ opportunity, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("details");
  const o = opportunity;

  const statusColor: Record<string, string> = {
    new: "#00c853", active: "#209dd7", inactive: "#ecad0a", completed: "#ff1744", cancelled: "#ff1744",
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "documents", label: "Documents" },
    { id: "comments", label: "Comments" },
    { id: "progress", label: "Progress" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#161b22] border-b border-gray-700/50">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
        >
          &#8592; Back
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-200 truncate">
            {o.property_name ?? "Unnamed Property"}
          </h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{[o.city, o.state, o.country].filter(Boolean).join(", ") || "Unknown location"}</span>
            <span className="capitalize font-medium" style={{ color: statusColor[o.status] ?? "#6b7280" }}>
              {o.status}
            </span>
          </div>
        </div>
        <VoteButtons
          opportunityId={o.id}
          initialScore={o.vote_score}
          initialCount={o.vote_count}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700/50 bg-[#161b22]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              tab === t.id
                ? "text-[#209dd7] border-b-2 border-[#209dd7]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4">
        {tab === "details" && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Property Name" value={o.property_name} />
            <Field label="Address" value={o.address} />
            <Field label="City" value={o.city} />
            <Field label="State" value={o.state} />
            <Field label="Country" value={o.country} />
            <Field label="Asking Price" value={formatPrice(o.asking_price)} />
            <Field label="Property Type" value={o.property_type} capitalize />
            <Field label="Size" value={formatSqft(o.size_sqft)} />
            <Field label="Year Built" value={o.year_built?.toString()} />
            <Field label="Cap Rate" value={formatPct(o.cap_rate)} />
            <Field label="NOI" value={formatPrice(o.noi)} />
            <Field label="Occupancy Rate" value={formatPct(o.occupancy_rate)} />
            <Field label="IRR Projection" value={formatPct(o.irr_projection)} />
            <Field label="Assigned To" value={o.assigned_to != null ? `User #${o.assigned_to}` : "Unassigned"} />
            <Field label="Created" value={new Date(o.created_at).toLocaleString()} />
            <Field label="Updated" value={new Date(o.updated_at).toLocaleString()} />
            {o.rent_roll_summary && (
              <div className="col-span-full">
                <Field label="Rent Roll Summary" value={o.rent_roll_summary} long />
              </div>
            )}
            {o.debt_terms && (
              <div className="col-span-full">
                <Field label="Debt Terms" value={o.debt_terms} long />
              </div>
            )}
            {o.seller_info && (
              <div className="col-span-full">
                <Field label="Seller Info" value={o.seller_info} long />
              </div>
            )}
          </div>
        )}

        {tab === "documents" && (
          <DocumentList opportunityId={o.id} documents={o.documents} />
        )}

        {tab === "comments" && (
          <CommentSection opportunityId={o.id} />
        )}

        {tab === "progress" && (
          <ProgressSection opportunityId={o.id} assignedTo={o.assigned_to} />
        )}
      </div>
    </div>
  );
}

function Field({ label, value, capitalize: cap, long }: { label: string; value?: string | null; capitalize?: boolean; long?: boolean }) {
  return (
    <div className={long ? "" : ""}>
      <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-sm text-gray-200 ${cap ? "capitalize" : ""} ${long ? "whitespace-pre-wrap" : "truncate"}`}>
        {value ?? <span className="text-gray-600">N/A</span>}
      </div>
    </div>
  );
}
