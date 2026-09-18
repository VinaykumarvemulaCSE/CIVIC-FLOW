import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import { TOWN_BOUNDS, TOWN_CENTER, type Issue, type Severity } from "@/lib/civic/types";

const AREA_BOUNDS = L.latLngBounds(
  [TOWN_BOUNDS.south, TOWN_BOUNDS.west],
  [TOWN_BOUNDS.north, TOWN_BOUNDS.east],
);

const PIN_COLOR: Record<Severity, string> = {
  critical: "#e5484d",
  high: "#f76b15",
  medium: "#f5c518",
  low: "#3fa46a",
};

function pinIcon(issue: Issue) {
  const color = issue.status === "resolved" ? "#3fa46a" : PIN_COLOR[issue.severity];
  const count = issue.reportCount > 1 ? `<span>${issue.reportCount}</span>` : "";
  return L.divIcon({
    className: "civic-pin",
    html: `<div style="background:${color}" class="civic-pin-dot">${count}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

function FitBounds({ issues }: { issues: Issue[] }) {
  const map = useMap();
  useEffect(() => {
    const inArea = issues.filter((i) => AREA_BOUNDS.contains([i.lat, i.lng]));
    if (!inArea.length) {
      map.fitBounds(AREA_BOUNDS, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(inArea.map((i) => [i.lat, i.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.35), { animate: false, maxZoom: 17 });
  }, [issues, map]);
  return null;
}

export default function IssueLeafletMap({
  issues,
  selected,
  onSelect,
  height = 460,
}: {
  issues: Issue[];
  selected?: string | undefined;
  onSelect?: (issueId: string) => void;
  height?: number;
}) {
  return (
    <div className="overflow-hidden rounded-md border" style={{ height }}>
      <MapContainer
        center={[TOWN_CENTER.lat, TOWN_CENTER.lng]}
        zoom={15}
        minZoom={13}
        maxZoom={18}
        maxBounds={AREA_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds issues={issues} />
        {issues.map((issue) => (
          <Marker
            key={issue.issueId}
            position={[issue.lat, issue.lng]}
            icon={pinIcon(issue)}
            opacity={selected && selected !== issue.issueId ? 0.6 : 1}
            eventHandlers={{ click: () => onSelect?.(issue.issueId) }}
          >
            <Popup>
              <strong>{issue.issueId}</strong>
              <br />
              {issue.title}
              <br />
              {issue.severity.toUpperCase()} · priority {issue.priorityScore}/100 ·{" "}
              {issue.reportCount} report(s)
              <br />
              {issue.address}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
