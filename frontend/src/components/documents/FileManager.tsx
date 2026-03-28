"use client";

import { useState, useEffect } from "react";
import type { Document } from "@/types";
import * as api from "@/lib/api";
import { documentDownloadUrl } from "@/lib/api";

function formatSize(bytes: number | null): string {
  if (bytes == null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
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

export default function FileManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOppId, setFilterOppId] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    const oppId = filterOppId ? parseInt(filterOppId, 10) : undefined;
    api
      .listDocuments(oppId && !isNaN(oppId) ? oppId : undefined)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [filterOppId]);

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-gray-700/50">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Filter by Opportunity:</span>
        <input
          type="text"
          value={filterOppId}
          onChange={(e) => setFilterOppId(e.target.value)}
          placeholder="Opportunity ID"
          className="bg-[#0d1117] border border-gray-700/50 rounded px-2 py-1 text-xs text-gray-300 w-32 focus:outline-none focus:border-[#209dd7]"
        />
        {filterOppId && (
          <button
            onClick={() => setFilterOppId("")}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-[10px] text-gray-600">
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block w-5 h-5 border-2 border-[#209dd7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-600">No documents found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#161b22] z-10">
              <tr className="border-b border-gray-700/50">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">File</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Opportunity</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Uploaded</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-700/20 hover:bg-[#1c2129] transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{fileIcon(doc.file_type)}</span>
                      <span className="text-gray-200 truncate max-w-[240px]">{doc.original_filename}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-400 uppercase text-xs">{doc.file_type ?? "-"}</td>
                  <td className="px-3 py-2 text-gray-400 text-right font-mono text-xs">{formatSize(doc.file_size)}</td>
                  <td className="px-3 py-2 text-gray-400">
                    {doc.opportunity_id != null ? (
                      <span className="text-xs bg-[#209dd7]/10 text-[#209dd7] px-1.5 py-0.5 rounded">
                        #{doc.opportunity_id}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{formatDate(doc.uploaded_at)}</td>
                  <td className="px-3 py-2 text-center">
                    <a
                      href={documentDownloadUrl(doc.id)}
                      className="text-xs text-[#209dd7] hover:text-[#209dd7]/80 transition-colors"
                      download
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
