interface ActivityItem {
  id: string;
  message: string;
  timestamp: string;
  user?: string;
}

interface ActivityWidgetProps {
  label?: string;
  items?: ActivityItem[];
}

export function ActivityWidget({ label = "Recent Activity", items = [] }: ActivityWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-sm font-medium text-foreground-muted mb-4">{label}</h3>
      {items.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-brand shrink-0" />
              <span className="text-foreground-muted">Activity placeholder #{i}</span>
              <span className="ml-auto text-foreground-subtle text-xs shrink-0">Just now</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-brand shrink-0" />
              <span className="text-foreground-muted flex-1 truncate">{item.message}</span>
              <span className="ml-auto text-foreground-subtle text-xs shrink-0">{item.timestamp}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
