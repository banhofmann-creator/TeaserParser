"use client";

import { useState, useEffect } from "react";

export default function PowerBIDashboard() {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config/powerbi", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.embed_url) setEmbedUrl(data.embed_url);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="inline-block w-6 h-6 border-2 border-[#209dd7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (embedUrl) {
    return (
      <div className="flex-1 flex flex-col">
        <iframe
          title="BTP Dashboard"
          src={embedUrl}
          className="flex-1 w-full border-0"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">&#x1F4CA;</div>
        <h2 className="text-lg font-semibold text-gray-300 mb-2">PowerBI Dashboard</h2>
        <p className="text-sm text-gray-500 mb-4">
          No dashboard configured yet. Set the <code className="text-[#ecad0a] bg-[#1a1a2e] px-1.5 py-0.5 rounded text-xs">POWERBI_EMBED_URL</code> environment variable to embed your PowerBI report.
        </p>
        <div className="text-left bg-[#161b22] border border-gray-700/50 rounded p-4 text-xs text-gray-400">
          <p className="font-semibold text-gray-300 mb-2">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Create a report in PowerBI Desktop</li>
            <li>Connect to the PostgreSQL database</li>
            <li>Publish to PowerBI Service</li>
            <li>Use &ldquo;Publish to Web&rdquo; to generate an embed URL</li>
            <li>Set <code className="text-[#ecad0a]">POWERBI_EMBED_URL</code> in your <code className="text-[#ecad0a]">.env</code> file</li>
            <li>Restart the application</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
