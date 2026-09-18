import { Suspense, lazy, useEffect, useState } from "react";
import type { Issue } from "@/lib/civic/types";

/**
 * Leaflet + OpenStreetMap only exist in the browser, so the real map is loaded
 * after hydration. No API key is needed for OSM tiles.
 */
const Inner = lazy(() => import("./issue-map-leaflet"));

export function IssueMap(props: {
  issues: Issue[];
  selected?: string | undefined;
  onSelect?: (issueId: string) => void;
  height?: number;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const height = props.height ?? 460;

  if (!ready) {
    return (
      <div
        className="grid place-items-center rounded-md border bg-muted/30 text-xs text-muted-foreground"
        style={{ height }}
      >
        Loading map…
      </div>
    );
  }
  return (
    <Suspense
      fallback={
        <div
          className="grid place-items-center rounded-md border bg-muted/30 text-xs text-muted-foreground"
          style={{ height }}
        >
          Loading map…
        </div>
      }
    >
      <Inner {...props} />
    </Suspense>
  );
}
