import { AlertTriangle, CheckCircle2, Clock, HelpCircle, Split, XCircle, type LucideIcon } from "lucide-react";
import type { Decision } from "@/lib/types";

export const STATUS_STYLE: Record<Decision, { icon: LucideIcon; badge: string }> = {
  denied: { icon: XCircle, badge: "border-transparent bg-denied-bg text-denied" },
  pended: { icon: Clock, badge: "border-transparent bg-pended-bg text-pended" },
  approved: { icon: CheckCircle2, badge: "border-transparent bg-approved-bg text-approved" },
  error: { icon: AlertTriangle, badge: "border-transparent bg-error-bg text-error" },
  mixed: { icon: Split, badge: "border-transparent bg-unknown-bg text-unknown" },
  unknown: { icon: HelpCircle, badge: "border-transparent bg-unknown-bg text-unknown" },
};
