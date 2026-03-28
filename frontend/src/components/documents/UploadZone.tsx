"use client";

import { useState, useRef, useCallback } from "react";
import type { Opportunity, Document } from "@/types";
import * as api from "@/lib/api";

const ACCEPTED = ".pdf,.docx,.xlsx,.jpg,.jpeg,.png";

interface UploadResult {
  opportunity: Opportunity;
  documents: Document[];
}

export default function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.uploadDocuments(files);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function formatPrice(v: number | null): string {
    if (v == null) return "N/A";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`w-full max-w-lg border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-[#209dd7] bg-[#209dd7]/5"
            : "border-gray-700/50 bg-[#161b22] hover:border-gray-600"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />
        {uploading ? (
          <div>
            <div className="inline-block w-8 h-8 border-2 border-[#209dd7] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-400">Uploading and parsing...</p>
          </div>
        ) : (
          <>
            <div className="text-4xl mb-3">&#x1F4C1;</div>
            <p className="text-sm text-gray-300 mb-1">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-xs text-gray-600">
              PDF, DOCX, XLSX, JPG, PNG
            </p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 w-full max-w-lg bg-[#ff1744]/10 border border-[#ff1744]/30 rounded px-4 py-3">
          <p className="text-sm text-[#ff1744]">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-4 w-full max-w-lg bg-[#161b22] border border-gray-700/50 rounded p-4">
          <h3 className="text-sm font-semibold text-[#00c853] mb-3">
            Parsed Successfully
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-gray-500">Property:</span>
            <span className="text-gray-200">{result.opportunity.property_name ?? "Unnamed"}</span>
            <span className="text-gray-500">Location:</span>
            <span className="text-gray-200">
              {[result.opportunity.city, result.opportunity.state].filter(Boolean).join(", ") || "N/A"}
            </span>
            <span className="text-gray-500">Price:</span>
            <span className="text-gray-200">{formatPrice(result.opportunity.asking_price)}</span>
            <span className="text-gray-500">Type:</span>
            <span className="text-gray-200 capitalize">{result.opportunity.property_type ?? "N/A"}</span>
            <span className="text-gray-500">Documents:</span>
            <span className="text-gray-200">{result.documents.length} file(s) uploaded</span>
          </div>
        </div>
      )}
    </div>
  );
}
