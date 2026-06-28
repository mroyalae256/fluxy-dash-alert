import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats, type StatsWindow } from "@/lib/dashboard.functions";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuToggle } from "@/components/neu/NeuToggle";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function EventsBarChart() {
  const [win, setWin] = useState<StatsWindow>("24h");
  const fn = useServerFn(getDashboardStats);
  const { data, isFetching } = useQuery({
    queryKey: ["dashboard-stats", win],
    queryFn: () => fn({ data: { window: win } }),
    refetchInterval: 60_000,
  });

  return (
    <NeuCard className="h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Activity over time</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            Auto-refresh every 1 min
          </p>
        </div>
        <NeuToggle
          value={win}
          onChange={setWin}
          options={[{ value: "24h", label: "24h" }, { value: "7d", label: "7d" }]}
        />
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.series ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "none",
                borderRadius: 12,
                boxShadow: "var(--neu-shadow-out-sm)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="events" fill="var(--info)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="alarms" fill="var(--warn)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="critical" fill="var(--critical)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </NeuCard>
  );
}
