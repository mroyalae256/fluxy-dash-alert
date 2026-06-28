import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function NeuCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("neu-raised p-5", className)} {...props} />;
}

export function NeuInset({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("neu-inset p-3", className)} {...props} />;
}
