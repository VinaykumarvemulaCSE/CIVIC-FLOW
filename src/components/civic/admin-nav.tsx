import {
  BarChart3,
  Gauge,
  Layers,
  ListChecks,
  ScrollText,
  SlidersHorizontal,
  Users,
  Workflow,
} from "lucide-react";
import type { NavItem } from "@/components/civic/app-shell";

export const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Overview", icon: <Gauge className="size-4" />, exact: true },
  { to: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="size-4" /> },
  { to: "/admin/users", label: "Users", icon: <Users className="size-4" /> },
  { to: "/admin/complaints", label: "All complaints", icon: <ListChecks className="size-4" /> },
  { to: "/admin/issues", label: "All issues", icon: <Layers className="size-4" /> },
  { to: "/admin/audit", label: "Audit log", icon: <ScrollText className="size-4" /> },
  { to: "/admin/rules", label: "Triage rules", icon: <SlidersHorizontal className="size-4" /> },
  { to: "/automation", label: "Automation", icon: <Workflow className="size-4" /> },
];
