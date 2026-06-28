import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRecentActivity, type ActivityFilter, type ActivitySort } from "@/lib/dashboard.functions";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuToggle } from "@/components/neu/NeuToggle";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity, AlertTriangle, Siren } from "lucide-react";

const kindIcon = {
  event: <Activity className="h-3.5 w-3.5 text-info" />,
  alarm: <AlertTriangle className="h-3.5 w-3.5" style={{ color: "var(--warn)" }} />,
  critical: <Siren className="h-3.5 w-3.5 text-critical" />,
};

export function ActivityFeed() {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [sort, setSort] = useState<ActivitySort>("newest");
  const fn = useServerFn(getRecentActivity);
  const { data } = useQuery({
    queryKey: ["activity", filter, sort],
    queryFn: () => fn({ data: { filter, sort, limit: 30 } }),
    refetchInterval: 30_000,
  });

  return (
    <NeuCard>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Recent activity</h3>
          <p className="text-xs text-muted-foreground">Sorted, filterable raw feed</p>
        </div>
        <div className="flex gap-2">
          <NeuToggle value={filter} onChange={setFilter} options={[
            { value: "all", label: "All" },
            { value: "events", label: "Events" },
            { value: "alarms", label: "Alarms" },
            { value: "critical", label: "Critical" },
          ]} />
          <NeuToggle value={sort} onChange={setSort} options={[
            { value: "newest", label: "Newest" },
            { value: "severity", label: "Severity" },
          ]} />
        </div>
      </div>

      <div className="neu-inset p-2 max-h-[420px] overflow-y-auto">
        <ul className="divide-y divide-border">
          {(data ?? []).map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 py-2.5 px-2">
              <div className="neu-raised-sm p-1.5 shrink-0">{kindIcon[item.kind]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{item.source}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.severity}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{item.message}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
            </li>
          ))}
          {(data ?? []).length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No activity</li>
          )}
        </ul>
      </div>
    </NeuCard>
  );
}
