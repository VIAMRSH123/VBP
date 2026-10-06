import type { ComponentType, SVGProps } from "react";
import type { UserRole } from "../types";
import { IconList, IconUser, IconUsers, IconChart, IconBell, IconPulse, IconSettings, IconWarehouse } from "./icons";

export interface NavItem {
  label: string;
  path: string;
  roles: UserRole[];
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const ALL_ROLES: UserRole[] = [
  "administrator",
  "sales_manager",
  "sales_representative",
  "executive",
  "read_only_auditor",
];

export const NAV_ITEMS: NavItem[] = [
  { label: "Lead Management", path: "/leads", roles: ALL_ROLES, icon: IconList },
  { label: "Sales Representative", path: "/my-leads", roles: ["administrator", "sales_manager", "sales_representative"], icon: IconUser },
  { label: "Sales Manager", path: "/team", roles: ["administrator", "sales_manager"], icon: IconUsers },
  { label: "Warehouse", path: "/warehouse", roles: ["administrator", "sales_manager", "executive", "read_only_auditor"], icon: IconWarehouse },
  { label: "Marketing Analytics", path: "/marketing", roles: ["administrator", "sales_manager", "executive"], icon: IconChart },
  { label: "Notification Centre", path: "/notifications", roles: ALL_ROLES, icon: IconBell },
  { label: "Operations", path: "/operations", roles: ["administrator", "sales_manager", "executive"], icon: IconPulse },
  { label: "Administration", path: "/admin", roles: ["administrator"], icon: IconSettings },
];
