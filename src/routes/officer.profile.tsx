import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { updateProfile, useComplaints, useOfficerLogs, useSession } from "@/lib/civic/store";
import { DEPARTMENTS, ZONES, type Department } from "@/lib/civic/types";

export const Route = createFileRoute("/officer/profile")({
  head: () => ({
    meta: [
      { title: "Officer profile — CivicFlow officer" },
      { name: "description", content: "Department, ward and workload for the signed-in officer." },
      { property: "og:title", content: "Officer profile — CivicFlow officer" },
      {
        property: "og:description",
        content: "Department, ward and workload for the signed-in officer.",
      },
    ],
  }),
  component: OfficerProfile,
});

function OfficerProfile() {
  const session = useSession();
  const logs = useOfficerLogs();
  const complaints = useComplaints();
  const [name, setName] = useState(session?.name ?? "");
  const [employeeId, setEmployeeId] = useState(session?.employeeId ?? "EMP-2291");
  const [department, setDepartment] = useState<Department>(session?.department ?? "Roads");
  const [zone, setZone] = useState<string>(session?.zone ?? ZONES[0]);

  const mine = complaints.filter((c) => c.officerName === session?.name);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">
            Officer details
          </h2>
          <div className="space-y-1.5">
            <Label htmlFor="n">Name</Label>
            <Input id="n" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp">Employee ID</Label>
            <Input id="emp" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
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
          <div className="space-y-1.5">
            <Label>Assigned zone</Label>
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZONES.map((z) => (
                  <SelectItem key={z} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              updateProfile({ name, employeeId, department, zone });
              toast.success("Officer profile updated");
            }}
          >
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardContent className="space-y-3 p-5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">Workload</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-muted-foreground">Complaints handled</span>
              <span className="font-semibold">{mine.length}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Closed</span>
              <span className="font-semibold">
                {mine.filter((c) => c.status === "resolved").length}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">In progress</span>
              <span className="font-semibold">
                {mine.filter((c) => c.status === "in_progress").length}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Logged actions</span>
              <span className="font-semibold">{logs.length}</span>
            </li>
          </ul>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Emails are sent through Nodemailer triggered by the n8n workflow once you act on a
            complaint.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
