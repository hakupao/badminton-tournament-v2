"use client";

import { cn } from "@/lib/utils";
import { ShuttlecockIcon } from "@/components/brand/shuttlecock-icon";

interface SiteLogoProps {
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  markClassName?: string;
  iconClassName?: string;
  size?: "nav" | "hero" | "login";
  showSubtitle?: boolean;
  centered?: boolean;
}

const sizeMap = {
  nav: {
    mark: "h-9 w-9 squircle-lg",
    icon: "h-5 w-5",
    title: "text-xl",
    subtitle: "text-xs",
    gap: "gap-2.5",
  },
  hero: {
    mark: "h-14 w-14 squircle-panel",
    icon: "h-8 w-8",
    title: "text-3xl md:text-4xl",
    subtitle: "text-sm",
    gap: "gap-3.5",
  },
  login: {
    mark: "h-20 w-20 squircle-panel [--squircle-radius:2.25rem] [--squircle-shape:superellipse(2.9)]",
    icon: "h-10 w-10",
    title: "text-2xl",
    subtitle: "text-sm",
    gap: "gap-4",
  },
} as const;

export function SiteLogo({
  className,
  titleClassName,
  subtitleClassName,
  markClassName,
  iconClassName,
  size = "nav",
  showSubtitle = false,
  centered = false,
}: SiteLogoProps) {
  const config = sizeMap[size];

  return (
    <div className={cn("flex items-center", config.gap, centered && "flex-col text-center", className)}>
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 shadow-md shadow-green-200/60 ring-1 ring-white/40",
          config.mark,
          markClassName
        )}
      >
        <ShuttlecockIcon className={cn("text-white", config.icon, iconClassName)} />
      </div>

      <div className={cn(centered && "space-y-1")}>
        <div className={cn("font-extrabold tracking-tight text-green-800", config.title, titleClassName)}>
          ShuttleArena
        </div>
        {showSubtitle && (
          <p className={cn("font-medium text-gray-400", config.subtitle, subtitleClassName)}>
            羽球竞技场 · 团体循环赛管理系统
          </p>
        )}
      </div>
    </div>
  );
}
