import type { ComponentPropsWithoutRef, HTMLAttributes } from "react";
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

function getGenderSymbol(gender: Gender) {
  return gender === "M" ? "♂" : "♀";
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
      <span className={cn("inline-flex items-center justify-center leading-none", symbolClassName)}>
        {getGenderSymbol(gender)}
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
