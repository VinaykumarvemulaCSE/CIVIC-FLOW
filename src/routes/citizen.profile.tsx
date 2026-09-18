import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { updateProfile, useComplaints, useSession } from "@/lib/civic/store";

export const Route = createFileRoute("/citizen/profile")({
  head: () => ({
    meta: [
      { title: "My profile — CivicFlow AI" },
      { name: "description", content: "Your contact details and notification preferences." },
      { property: "og:title", content: "My profile — CivicFlow AI" },
      { property: "og:description", content: "Your contact details and notification preferences." },
    ],
  }),
  component: CitizenProfile,
});

function CitizenProfile() {
  const session = useSession();
  const complaints = useComplaints();
  const mine = complaints.filter((c) => c.citizenName === session?.name);
  const [name, setName] = useState(session?.name ?? "");
  const [email, setEmail] = useState(session?.email ?? "");
  const [phone, setPhone] = useState(session?.phone ?? "");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">Your details</h2>
          <div className="space-y-1.5">
            <Label htmlFor="n">Full name</Label>
            <Input id="n" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e">Email</Label>
            <Input id="e" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p">Phone</Label>
            <Input
              id="p"
              value={phone}
              placeholder="+91 ..."
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Separator />
          <h3 className="font-display text-base font-bold uppercase tracking-wide">
            Notifications
          </h3>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Email updates</p>
              <p className="text-xs text-muted-foreground">
                Status changes and resolution notices.
              </p>
            </div>
            <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">SMS updates</p>
              <p className="text-xs text-muted-foreground">
                Only for critical safety issues in your ward.
              </p>
            </div>
            <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
          </div>
          <Button
            onClick={() => {
              updateProfile({ name, email, phone });
              toast.success("Profile updated");
            }}
          >
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardContent className="space-y-3 p-5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">Civic score</h2>
          <p className="font-display text-5xl font-bold text-accent">
            {Math.min(100, mine.length * 14 + 30)}
          </p>
          <p className="text-sm text-muted-foreground">
            Based on {mine.length} report(s), how many were validated, and how few were rejected as
            spam.
          </p>
          <Separator />
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-muted-foreground">Reports filed</span>
              <span className="font-semibold">{mine.length}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Validated by officers</span>
              <span className="font-semibold">
                {
                  mine.filter((c) => c.status !== "awaiting_validation" && c.status !== "rejected")
                    .length
                }
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Resolved</span>
              <span className="font-semibold">
                {mine.filter((c) => c.status === "resolved").length}
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
