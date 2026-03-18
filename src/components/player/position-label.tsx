import type { ComponentPropsWithoutRef, HTMLAttributes } from "react";
import { Mars, Venus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Gender = "M" | "F";

interface PositionLabelProps extends HTMLAttributes<HTMLSpanElement> {
  gender: Gender;
  positionNumber: number;
  suffix?: string;
  symbolClassName?: string;
  textClassName?: string;
}

interface PositionBadgeProps extends Omit<ComponentPropsWithoutRef<typeof Badge>, "children"> {
  gender: Gender;
  positionNumber: number;
  suffix?: string;
  labelClassName?: string;
  symbolClassName?: string;
  textClassName?: string;
}

export function PositionLabel({
  gender,
  positionNumber,
  suffix = "号",
  className,
  symbolClassName,
  textClassName,
  ...props
}: PositionLabelProps) {
  return (
    <span
      className={cn("inline-flex min-w-0 items-center justify-center gap-1 leading-none", className)}
      {...props}
    >
      <span className={cn("inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none", symbolClassName)}>
        {gender === "M" ? <Mars aria-hidden="true" strokeWidth={1.8} /> : <Venus aria-hidden="true" strokeWidth={1.8} />}
      </span>
      <span className={cn("inline-flex items-center justify-center leading-none tabular-nums", textClassName)}>
        {positionNumber}
        {suffix}
      </span>
    </span>
  );
}

export function PositionBadge({
  gender,
  positionNumber,
  suffix = "号",
  className,
  labelClassName,
  symbolClassName,
  textClassName,
  variant = "outline",
  ...props
}: PositionBadgeProps) {
  return (
    <Badge variant={variant} className={cn("inline-flex items-center justify-center", className)} {...props}>
      <PositionLabel
        gender={gender}
        positionNumber={positionNumber}
        suffix={suffix}
        className={labelClassName}
        symbolClassName={symbolClassName}
        textClassName={textClassName}
      />
    </Badge>
  );
}
