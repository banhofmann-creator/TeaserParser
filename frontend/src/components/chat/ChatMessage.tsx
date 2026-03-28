"use client";

import type { ChatMessage as ChatMessageType } from "@/types";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-[#209dd7]/15 text-gray-200 border border-[#209dd7]/20"
            : "bg-[#1a1a2e] text-gray-300 border border-gray-700/30"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {/* Action badges */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.actions.map((action, i) => (
              <span
                key={i}
                className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#753991]/20 text-[#753991] border border-[#753991]/30"
              >
                {action.action}
                {action.opportunity_id ? ` #${action.opportunity_id}` : ""}
                {action.status ? ` -> ${action.status}` : ""}
              </span>
            ))}
          </div>
        )}
        <div className={`text-[10px] mt-1 ${isUser ? "text-[#209dd7]/50" : "text-gray-600"}`}>
          {timeAgo(message.created_at)}
        </div>
      </div>
    </div>
  );
}
