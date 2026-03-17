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
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 border-amber-200",
  active: "bg-green-100 text-green-700 border-green-200",
  finished: "bg-gray-100 text-gray-600 border-gray-200",
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
  description,
  icon: Icon,
  iconClassName,
  backHref = "/admin",
  actions,
  extraBadge,
}: AdminPageHeaderProps) {
  const { currentName, currentStatus } = useTournament();

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.4)] ring-1 ring-black/5 backdrop-blur-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Link href={backHref}>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl border border-gray-200 bg-white/90 px-3 text-gray-500 shadow-sm hover:bg-white"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
          </Link>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-sm">
            <Icon className={iconClassName || "w-5 h-5 text-gray-600"} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold tracking-tight text-gray-800 sm:text-2xl">{title}</h1>
              {currentName && (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                  {currentName}
                </Badge>
              )}
              {currentStatus && (
                <Badge className={`border ${STATUS_CLASSES[currentStatus] || STATUS_CLASSES.draft}`}>
                  {STATUS_LABELS[currentStatus] || currentStatus}
                </Badge>
              )}
              {extraBadge}
            </div>
            {description && <p className="max-w-3xl text-sm leading-6 text-gray-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">{actions}</div>}
      </div>
    </div>
  );
}
