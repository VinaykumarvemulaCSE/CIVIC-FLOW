import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_RULES, resetRules, saveRules, useRules } from "@/lib/civic/rules";
import {
  DEPARTMENTS,
  CATEGORY_LABEL,
  type Category,
  type Department,
  type Severity,
} from "@/lib/civic/types";

export const Route = createFileRoute("/admin/rules")({
  head: () => ({
    meta: [
      { title: "Triage rules — CIVIC-FLOW admin" },
      {
        name: "description",
        content: "Tune keywords, severity weights, SLA hours, routing and photo analysis.",
      },
      { property: "og:title", content: "Triage rules — CIVIC-FLOW admin" },
      {
        property: "og:description",
        content: "Supervisor controls for how CIVIC-FLOW agents score and route complaints.",
      },
    ],
  }),
  component: AdminRules,
});

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

function AdminRules() {
  const rules = useRules();
  const [draft, setDraft] = useState(rules);

  function num(v: string, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function save() {
    saveRules(draft);
    toast.success("Rules saved — new complaints use them immediately");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button onClick={save}>
          <Save className="size-4" /> Save rules
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            resetRules();
            setDraft(DEFAULT_RULES);
            toast.success("Rules reset to the defaults");
          }}
        >
          <RotateCcw className="size-4" /> Reset to defaults
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">
            Severity keywords
          </h2>
          <p className="text-sm text-muted-foreground">
            The review agent reads the complaint text for these words. Comma separated.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="crit">Critical words</Label>
              <Textarea
                id="crit"
                rows={4}
                value={draft.criticalWords.join(", ")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    criticalWords: e.target.value
                      .split(",")
                      .map((w) => w.trim().toLowerCase())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="high">High words</Label>
              <Textarea
                id="high"
                rows={4}
                value={draft.highWords.join(", ")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    highWords: e.target.value
                      .split(",")
                      .map((w) => w.trim().toLowerCase())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              Priority weights
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {SEVERITIES.map((s) => (
                <div key={s} className="space-y-1.5">
                  <Label className="capitalize">{s} base points</Label>
                  <Input
                    type="number"
                    value={draft.severityWeights[s]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        severityWeights: {
                          ...draft.severityWeights,
                          [s]: num(e.target.value, draft.severityWeights[s]),
                        },
                      })
                    }
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label>Points per repeat report</Label>
                <Input
                  type="number"
                  value={draft.reportWeight}
                  onChange={(e) =>
                    setDraft({ ...draft, reportWeight: num(e.target.value, draft.reportWeight) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Repeat report cap</Label>
                <Input
                  type="number"
                  value={draft.reportCap}
                  onChange={(e) =>
                    setDraft({ ...draft, reportCap: num(e.target.value, draft.reportCap) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Road-safety boost</Label>
                <Input
                  type="number"
                  value={draft.safetyBoost}
                  onChange={(e) =>
                    setDraft({ ...draft, safetyBoost: num(e.target.value, draft.safetyBoost) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duplicate window (hours)</Label>
                <Input
                  type="number"
                  value={draft.duplicateWindowHours}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      duplicateWindowHours: num(e.target.value, draft.duplicateWindowHours),
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              Response deadlines
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {SEVERITIES.map((s) => (
                <div key={s} className="space-y-1.5">
                  <Label className="capitalize">{s} — hours to resolve</Label>
                  <Input
                    type="number"
                    value={draft.slaHours[s]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        slaHours: {
                          ...draft.slaHours,
                          [s]: num(e.target.value, draft.slaHours[s]),
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <h2 className="pt-2 font-display text-lg font-bold uppercase tracking-wide">
              Photo analysis
            </h2>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Analyse uploaded photos</p>
                <p className="text-xs text-muted-foreground">
                  The review agent reads the photo for visible damage and hazards.
                </p>
              </div>
              <Switch
                checked={draft.useVision}
                onCheckedChange={(v) => setDraft({ ...draft, useVision: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Photo may raise severity</p>
                <p className="text-xs text-muted-foreground">
                  A photo can escalate a complaint but never lower it.
                </p>
              </div>
              <Switch
                checked={draft.visionCanEscalate}
                onCheckedChange={(v) => setDraft({ ...draft, visionCanEscalate: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Damage score that forces critical (0–100)</Label>
              <Input
                type="number"
                value={draft.visionCriticalScore}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    visionCriticalScore: num(e.target.value, draft.visionCriticalScore),
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">
            Department routing
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(draft.routing) as Category[]).map((cat) => (
              <div key={cat} className="space-y-1.5">
                <Label>{CATEGORY_LABEL[cat]}</Label>
                <Select
                  value={draft.routing[cat]}
                  onValueChange={(v) =>
                    setDraft({ ...draft, routing: { ...draft.routing, [cat]: v as Department } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">Admin access</h2>
          <p className="text-sm text-muted-foreground">
            Anyone signing in as a supervisor must enter this code.
          </p>
          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor="code">Access code</Label>
            <Input
              id="code"
              value={draft.adminAccessCode}
              onChange={(e) => setDraft({ ...draft, adminAccessCode: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} size="lg" className="w-full sm:w-auto">
        <Save className="size-4" /> Save rules
      </Button>
    </div>
  );
}
