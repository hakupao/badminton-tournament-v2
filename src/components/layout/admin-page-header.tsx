"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTournament } from "@/lib/tournament-context";

const STATUS_LABELS: Record<string, string> = {
  draft: "筹备中",
  active: "进行中",
  finished: "已结束",
  archived: "已归档",
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-amber-50 text-amber-600 border-amber-200",
  active: "bg-green-50 text-green-600 border-green-200",
  finished: "bg-gray-50 text-gray-500 border-gray-200",
  archived: "bg-blue-50 text-blue-600 border-blue-200",
};

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  iconClassName?: string;
  backHref?: string;
  actions?: ReactNode;
  extraBadge?: ReactNode;
}

export function AdminPageHeader({
  title,
  icon: Icon,
  iconClassName,
  backHref = "/admin",
  actions,
  extraBadge,
}: AdminPageHeaderProps) {
  const { currentName, currentStatus } = useTournament();

  return (
    <div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Link href={backHref} className="shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <Icon className={`shrink-0 ${iconClassName || "w-4.5 h-4.5 text-gray-500"}`} />
        <h1 className="text-lg font-bold text-gray-800 whitespace-nowrap">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-10 sm:pl-0">
        {currentName && (
          <Badge variant="outline" className="border-green-200 bg-green-50/80 text-green-700 text-xs font-medium shrink-0">
            {currentName}
          </Badge>
        )}
        {currentStatus && (
          <Badge className={`text-xs border shrink-0 ${STATUS_CLASSES[currentStatus] || STATUS_CLASSES.draft}`}>
            {STATUS_LABELS[currentStatus] || currentStatus}
          </Badge>
        )}
        {extraBadge}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 pl-10 sm:pl-0 sm:ml-auto">{actions}</div>}
    </div>
  );
}
