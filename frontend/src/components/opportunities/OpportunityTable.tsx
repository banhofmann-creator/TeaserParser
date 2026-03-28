"use client";

import { useState, useMemo } from "react";
import type { Opportunity, OpportunityStatus } from "@/types";

function formatPrice(v: number | null): string {
  if (v == null) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isNewOrUnassigned(o: Opportunity): boolean {
  if (o.status === "new" || o.assigned_to == null) return true;
  const created = new Date(o.created_at);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return created > sevenDaysAgo;
}

const STATUS_COLORS: Record<OpportunityStatus, string> = {
  new: "#00c853",
  active: "#209dd7",
  inactive: "#ecad0a",
  completed: "#ff1744",
  cancelled: "#ff1744",
};

type SortKey = "property_name" | "city" | "asking_price" | "cap_rate" | "property_type" | "status" | "assigned_to" | "vote_score" | "created_at";

interface Props {
  opportunities: Opportunity[];
  onSelect: (opp: Opportunity) => void;
  filters: { status?: string; property_type?: string };
  onFiltersChange: (f: { status?: string; property_type?: string }) => void;
}

export default function OpportunityTable({ opportunities, onSelect, filters, onFiltersChange }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const list = [...opportunities];
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = Number(av);
      const bn = Number(bv);
      return sortDir === "asc" ? an - bn : bn - an;
    });
    return list;
  }, [opportunities, sortKey, sortDir]);

  const propertyTypes = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => { if (o.property_type) set.add(o.property_type); });
    return Array.from(set).sort();
  }, [opportunities]);

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 select-none whitespace-nowrap"
    >
      {label}
      {sortKey === field && (
        <span className="ml-1 text-[#209dd7]">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>
      )}
    </th>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-gray-700/50">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Filters:</span>
        <select
          value={filters.status ?? ""}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })}
          className="bg-[#0d1117] border border-gray-700/50 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-[#209dd7]"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filters.property_type ?? ""}
          onChange={(e) => onFiltersChange({ ...filters, property_type: e.target.value || undefined })}
          className="bg-[#0d1117] border border-gray-700/50 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-[#209dd7]"
        >
          <option value="">All Types</option>
          {propertyTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span className="ml-auto text-[10px] text-gray-600">{sorted.length} opportunities</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#161b22] z-10">
            <tr className="border-b border-gray-700/50">
              <th className="w-3"></th>
              <SortHeader label="Name" field="property_name" />
              <SortHeader label="City" field="city" />
              <SortHeader label="Price" field="asking_price" />
              <SortHeader label="Cap Rate" field="cap_rate" />
              <SortHeader label="Type" field="property_type" />
              <SortHeader label="Status" field="status" />
              <SortHeader label="Assigned" field="assigned_to" />
              <SortHeader label="Votes" field="vote_score" />
              <SortHeader label="Date" field="created_at" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => {
              const highlight = isNewOrUnassigned(o);
              return (
                <tr
                  key={o.id}
                  onClick={() => onSelect(o)}
                  className={`border-b border-gray-700/20 cursor-pointer transition-colors hover:bg-[#1c2129] ${
                    highlight ? "animate-pulse-red" : ""
                  }`}
                >
                  <td className="px-2 py-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[o.status] }}
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-200 font-medium truncate max-w-[180px]">
                    {o.property_name ?? "Unnamed"}
                  </td>
                  <td className="px-3 py-2 text-gray-400 truncate max-w-[120px]">
                    {[o.city, o.state].filter(Boolean).join(", ") || "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-200 font-mono text-right">
                    {formatPrice(o.asking_price)}
                  </td>
                  <td className="px-3 py-2 text-gray-300 font-mono text-right">
                    {o.cap_rate != null ? `${o.cap_rate.toFixed(2)}%` : "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-400 capitalize truncate max-w-[100px]">
                    {o.property_type ?? "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="capitalize text-xs" style={{ color: STATUS_COLORS[o.status] }}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-400 text-center">
                    {o.assigned_to != null ? (
                      <span className="text-xs bg-[#209dd7]/10 text-[#209dd7] px-1.5 py-0.5 rounded">
                        #{o.assigned_to}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`font-mono text-xs ${
                      o.vote_score > 0 ? "text-[#00c853]" : o.vote_score < 0 ? "text-[#ff1744]" : "text-gray-500"
                    }`}>
                      {o.vote_score > 0 ? "+" : ""}{o.vote_score}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                    {formatDate(o.created_at)}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-600 text-sm">
                  No opportunities found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
