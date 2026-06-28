import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getComparisonStats } from "@/lib/dashboard.functions";
import { NeuCard } from "@/components/neu/NeuCard";

export function ComparisonChart() {
  const fn = useServerFn(getComparisonStats);
  const { data } = useQuery({
    queryKey: ["comparison-stats"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });

  return (
    <NeuCard className="h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Today vs Yesterday</h3>
        <p className="text-xs text-muted-foreground">Side-by-side comparison</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="category" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)", border: "none",
                borderRadius: 12, boxShadow: "var(--neu-shadow-out-sm)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="yesterday" fill="var(--muted-foreground)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="today" fill="var(--primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </NeuCard>
  );
}
