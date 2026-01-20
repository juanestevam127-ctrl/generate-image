import { type ClassValue, clsx } from "clsx";
// We don't have tailwind-merge, so we just use clsx. 
// If we had tailwind, we would use twMerge(clsx(inputs))
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
