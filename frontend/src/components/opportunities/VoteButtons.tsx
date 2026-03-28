"use client";

import { useState } from "react";
import * as api from "@/lib/api";

interface Props {
  opportunityId: number;
  initialScore: number;
  initialCount: number;
  initialUserVote?: 1 | -1 | null;
}

export default function VoteButtons({ opportunityId, initialScore, initialCount, initialUserVote }: Props) {
  const [score, setScore] = useState(initialScore);
  const [count, setCount] = useState(initialCount);
  const [userVote, setUserVote] = useState<1 | -1 | null>(initialUserVote ?? null);
  const [loading, setLoading] = useState(false);

  async function handleVote(vote: 1 | -1) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.castVote(opportunityId, vote);
      setScore(res.vote_score);
      setCount(res.vote_count);
      setUserVote(res.user_vote);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote(1)}
        disabled={loading}
        className={`w-7 h-7 rounded flex items-center justify-center text-sm font-bold transition-colors ${
          userVote === 1
            ? "bg-[#00c853]/20 text-[#00c853] border border-[#00c853]/50"
            : "bg-[#1a1a2e] text-gray-400 border border-gray-700/50 hover:text-[#00c853] hover:border-[#00c853]/30"
        }`}
        title="Upvote"
      >
        &#9650;
      </button>
      <span className={`text-sm font-mono min-w-[28px] text-center ${
        score > 0 ? "text-[#00c853]" : score < 0 ? "text-[#ff1744]" : "text-gray-400"
      }`}>
        {score > 0 ? "+" : ""}{score}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={loading}
        className={`w-7 h-7 rounded flex items-center justify-center text-sm font-bold transition-colors ${
          userVote === -1
            ? "bg-[#ff1744]/20 text-[#ff1744] border border-[#ff1744]/50"
            : "bg-[#1a1a2e] text-gray-400 border border-gray-700/50 hover:text-[#ff1744] hover:border-[#ff1744]/30"
        }`}
        title="Downvote"
      >
        &#9660;
      </button>
      <span className="text-[10px] text-gray-600 ml-1">{count} vote{count !== 1 ? "s" : ""}</span>
    </div>
  );
}
