"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Opportunity, OpportunityStatus } from "@/types";
import OpportunityPopup from "./OpportunityPopup";

// --- Marker colors by status ---
const STATUS_COLORS: Record<OpportunityStatus, string> = {
  new: "#00c853",
  active: "#209dd7",
  inactive: "#ecad0a",
  completed: "#ff1744",
  cancelled: "#ff1744",
};

function makeIcon(status: OpportunityStatus, isNew: boolean): L.DivIcon {
  const color = STATUS_COLORS[status] ?? "#209dd7";
  const pulse = isNew
    ? `<span style="position:absolute;top:-4px;left:-4px;width:20px;height:20px;border-radius:50%;background:rgba(255,23,68,0.4);animation:marker-pulse 2s ease-in-out infinite;"></span>`
    : "";
  return L.divIcon({
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8],
    html: `<div style="position:relative;">${pulse}<span style="display:block;width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #0d1117;box-shadow:0 0 4px ${color}80;"></span></div>`,
  });
}

function isNewOrUnassigned(o: Opportunity): boolean {
  if (o.status === "new" || o.assigned_to == null) return true;
  const created = new Date(o.created_at);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return created > sevenDaysAgo;
}

// --- Auto-fit bounds ---
function FitBounds({ opportunities }: { opportunities: Opportunity[] }) {
  const map = useMap();

  useEffect(() => {
    const pts = opportunities
      .filter((o) => o.latitude != null && o.longitude != null)
      .map((o) => [o.latitude!, o.longitude!] as [number, number]);
    if (pts.length > 0) {
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [opportunities, map]);

  return null;
}

// --- Main component ---
interface Props {
  opportunities: Opportunity[];
  onViewDetails?: (opp: Opportunity) => void;
}

export default function OpportunityMap({ opportunities, onViewDetails }: Props) {
  const mapRef = useRef<L.Map | null>(null);

  const validOpps = opportunities.filter(
    (o) => o.latitude != null && o.longitude != null
  );

  const center: [number, number] =
    validOpps.length > 0
      ? [validOpps[0].latitude!, validOpps[0].longitude!]
      : [39.8283, -98.5795]; // US center

  return (
    <>
      <style>{`
        @keyframes marker-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.8); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          background: #161b22 !important;
          color: #e5e7eb !important;
          border: 1px solid #30363d !important;
          border-radius: 6px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-tip {
          background: #161b22 !important;
          border: 1px solid #30363d !important;
        }
        .leaflet-popup-close-button {
          color: #6b7280 !important;
        }
        .leaflet-popup-close-button:hover {
          color: #e5e7eb !important;
        }
        .leaflet-control-zoom a {
          background: #161b22 !important;
          color: #e5e7eb !important;
          border-color: #30363d !important;
        }
        .leaflet-control-zoom a:hover {
          background: #1c2129 !important;
        }
        .leaflet-control-attribution {
          background: rgba(13,17,23,0.8) !important;
          color: #484f58 !important;
        }
        .leaflet-control-attribution a {
          color: #484f58 !important;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={5}
        ref={mapRef}
        style={{ height: "100%", width: "100%", background: "#0d1117" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds opportunities={validOpps} />
        {validOpps.map((opp) => (
          <Marker
            key={opp.id}
            position={[opp.latitude!, opp.longitude!]}
            icon={makeIcon(opp.status, isNewOrUnassigned(opp))}
          >
            <Popup>
              <OpportunityPopup opportunity={opp} onViewDetails={onViewDetails} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
