import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { registerUser, removeUser, updateUser, useUsers } from "@/lib/civic/users";
import { useSession } from "@/lib/civic/store";
import { DEPARTMENTS, ZONES, type Department, type Role } from "@/lib/civic/types";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — CIVIC-FLOW admin" },
      {
        name: "description",
        content: "Manage citizens, officers and supervisors who use CIVIC-FLOW.",
      },
      { property: "og:title", content: "Users — CIVIC-FLOW admin" },
      {
        property: "og:description",
        content: "Roles, zones and access for every CIVIC-FLOW user.",
      },
    ],
  }),
  component: AdminUsers,
});

const ROLES: Role[] = ["citizen", "officer", "admin"];

function AdminUsers() {
  const users = useUsers();
  const session = useSession();
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("officer");
  const [department, setDepartment] = useState<Department>("Roads");
  const [zone, setZone] = useState<string>(ZONES[0]);

  const filtered = users.filter((u) =>
    `${u.name} ${u.email} ${u.role} ${u.department ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.includes("@")) {
      toast.error("Enter a name and a valid email.");
      return;
    }
    registerUser({
      role,
      name: name.trim(),
      email: email.trim(),
      ...(role === "officer" ? { department, zone } : {}),
    });
    toast.success(`${name.trim()} added as ${role}`);
    setName("");
    setEmail("");
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">Add a user</h2>
          <form onSubmit={invite} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="n">Name</Label>
              <Input id="n" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e">Email</Label>
              <Input id="e" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {role === "officer" ? (
              <>
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
                  <Label>Zone</Label>
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
              </>
            ) : (
              <div className="hidden lg:block" />
            )}
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <UserPlus className="size-4" /> Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              Directory ({users.length})
            </h2>
            <Input
              placeholder="Search name, email, department…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full sm:w-72"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Department / zone</TableHead>
                  <TableHead className="hidden lg:table-cell">Last seen</TableHead>
                  <TableHead className="text-right">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const isMe = session?.email.toLowerCase() === u.email.toLowerCase();
                  return (
                    <TableRow key={u.id} className={u.status === "suspended" ? "opacity-60" : ""}>
                      <TableCell>
                        <p className="font-medium">
                          {u.name} {isMe && <span className="text-xs text-accent">(you)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        {u.employeeId && (
                          <p className="font-mono text-xs text-muted-foreground">{u.employeeId}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(v) => {
                            updateUser(u.id, { role: v as Role });
                            toast.success(`${u.name} is now ${v}`);
                          }}
                        >
                          <SelectTrigger className="w-32 capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r} className="capitalize">
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden text-sm md:table-cell">
                        {u.role === "officer" ? (
                          <>
                            <p>{u.department ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{u.zone ?? "—"}</p>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {new Date(u.lastSeen).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant={u.status === "active" ? "outline" : "default"}
                            disabled={isMe}
                            onClick={() => {
                              const next = u.status === "active" ? "suspended" : "active";
                              updateUser(u.id, { status: next });
                              toast.success(
                                next === "suspended"
                                  ? `${u.name} can no longer sign in`
                                  : `${u.name} restored`,
                              );
                            }}
                          >
                            {u.status === "active" ? "Suspend" : "Restore"}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isMe}
                            onClick={() => {
                              removeUser(u.id);
                              toast.success(`${u.name} removed`);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
