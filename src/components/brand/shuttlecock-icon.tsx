import type { ComponentProps } from "react";
import Icon from "@mdi/react";
import { mdiBadminton } from "@mdi/js";
import { cn } from "@/lib/utils";

type ShuttlecockIconProps = Omit<ComponentProps<typeof Icon>, "path">;

export function ShuttlecockIcon({ className, color = "currentColor", ...props }: ShuttlecockIconProps) {
  return (
    <Icon
      path={mdiBadminton}
      color={color}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}
