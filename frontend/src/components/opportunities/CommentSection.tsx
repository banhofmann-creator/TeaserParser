"use client";

import { useState, useEffect } from "react";
import type { Comment } from "@/types";
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
}

export default function CommentSection({ opportunityId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .listComments(opportunityId)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [opportunityId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const c = await api.addComment(opportunityId, content.trim());
      setComments((prev) => [...prev, c]);
      setContent("");
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto space-y-3 pr-1">
        {loading && <p className="text-xs text-gray-500">Loading comments...</p>}
        {!loading && comments.length === 0 && (
          <p className="text-xs text-gray-600">No comments yet.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="bg-[#0d1117] rounded p-3 border border-gray-700/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[#209dd7]">{c.username}</span>
              <span className="text-[10px] text-gray-600">{timeAgo(c.created_at)}</span>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{c.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-[#0d1117] border border-gray-700/50 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#209dd7] focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-4 py-2 bg-[#753991] text-white text-sm rounded hover:bg-[#753991]/80 disabled:opacity-40 transition-colors"
        >
          {submitting ? "..." : "Post"}
        </button>
      </form>
    </div>
  );
}
