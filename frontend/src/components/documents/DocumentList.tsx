"use client";

import type { Document } from "@/types";
import { documentDownloadUrl } from "@/lib/api";

function formatSize(bytes: number | null): string {
  if (bytes == null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string | null): string {
  if (!type) return "\u{1F4C4}";
  const t = type.toLowerCase();
  if (t === "pdf") return "\u{1F4D5}";
  if (t === "docx" || t === "doc") return "\u{1F4D8}";
  if (t === "xlsx" || t === "xls") return "\u{1F4D7}";
  if (t === "jpg" || t === "jpeg" || t === "png") return "\u{1F5BC}";
  return "\u{1F4C4}";
}

interface Props {
  opportunityId: number;
  documents: Document[];
}

export default function DocumentList({ documents }: Props) {
  if (documents.length === 0) {
    return <p className="text-xs text-gray-600">No documents attached.</p>;
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 bg-[#0d1117] rounded p-3 border border-gray-700/30"
        >
          <span className="text-lg">{fileIcon(doc.file_type)}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-200 truncate">{doc.original_filename}</div>
            <div className="text-[10px] text-gray-600">
              {doc.file_type?.toUpperCase() ?? "FILE"} &middot; {formatSize(doc.file_size)}
            </div>
          </div>
          <a
            href={documentDownloadUrl(doc.id)}
            className="text-xs text-[#209dd7] hover:text-[#209dd7]/80 transition-colors shrink-0"
            download
          >
            Download
          </a>
        </div>
      ))}
    </div>
  );
}
