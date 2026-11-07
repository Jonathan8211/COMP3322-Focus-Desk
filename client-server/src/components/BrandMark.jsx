import { Sparkles } from "lucide-react";

export default function BrandMark({ size = "md", className = "" }) {
  const box = size === "lg" ? "w-12 h-12 rounded-2xl" : "w-8 h-8 rounded-xl";
  const icon = size === "lg" ? "w-6 h-6" : "w-4 h-4";

  return (
    <div
      className={`${box} bg-gray-900 dark:bg-white flex items-center justify-center ${className}`}
    >
      <Sparkles className={`${icon} text-white dark:text-gray-900`} strokeWidth={1.75} />
    </div>
  );
}
