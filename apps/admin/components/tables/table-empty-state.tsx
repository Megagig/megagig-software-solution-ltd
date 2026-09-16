import { Database } from "@/lib/icons";

export function TableEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-foreground/5 p-4 mb-4">
        <Database className="h-8 w-8 text-foreground-subtle" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">No records found</h3>
      <p className="text-sm text-foreground-subtle">
        Try adjusting your search or filters
      </p>
    </div>
  );
}
