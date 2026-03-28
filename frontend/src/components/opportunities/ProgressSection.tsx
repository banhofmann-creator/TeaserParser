"use client";

import { useState, useEffect } from "react";
import type { ProgressNote } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import * as api from "@/lib/api";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Props {
  opportunityId: number;
  assignedTo: number | null;
}

export default function ProgressSection({ opportunityId, assignedTo }: Props) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canAdd = user && (user.role === "admin" || user.id === assignedTo);

  useEffect(() => {
    setLoading(true);
    api
      .listProgress(opportunityId)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [opportunityId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || submitting) return;
    setSubmitting(true);
    try {
      const n = await api.addProgress(opportunityId, note.trim());
      setNotes((prev) => [...prev, n]);
      setNote("");
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto space-y-3 pr-1">
        {loading && <p className="text-xs text-gray-500">Loading progress notes...</p>}
        {!loading && notes.length === 0 && (
          <p className="text-xs text-gray-600">No progress notes yet.</p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="bg-[#0d1117] rounded p-3 border border-gray-700/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[#ecad0a]">{n.username}</span>
              <span className="text-[10px] text-gray-600">{timeAgo(n.created_at)}</span>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{n.note}</p>
          </div>
        ))}
      </div>
      {canAdd && (
        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a progress note..."
            className="flex-1 bg-[#0d1117] border border-gray-700/50 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#ecad0a] focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting || !note.trim()}
            className="px-4 py-2 bg-[#753991] text-white text-sm rounded hover:bg-[#753991]/80 disabled:opacity-40 transition-colors"
          >
            {submitting ? "..." : "Add"}
          </button>
        </form>
      )}
    </div>
  );
}
