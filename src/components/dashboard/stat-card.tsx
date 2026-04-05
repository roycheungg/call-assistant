import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ title, value, subtitle, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="border-white/10 bg-[#161b22]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value}</p>
            {subtitle && (
              <p
                className={cn(
                  "text-xs mt-1",
                  trend === "up" && "text-emerald-400",
                  trend === "down" && "text-red-400",
                  (!trend || trend === "neutral") && "text-slate-500"
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div className="w-10 h-10 bg-blue-600/15 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 text-blue-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
