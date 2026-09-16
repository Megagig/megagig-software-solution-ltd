import type { ColumnDefinition } from "@/lib/resource";
import { Check, X, Play, ExternalLink } from "@/lib/icons";
import { formatDate, formatRelative, formatCurrency } from "@/lib/formatters";

export function renderCell(
  column: ColumnDefinition,
  value: unknown,
  row: Record<string, unknown>
): React.ReactNode {
  // v3.31.15: custom cell renderer takes precedence — lets the resource
  // definition pack multiple fields into one column without needing a
  // hand-written page.tsx wrapper.
  if (column.cell) {
    return column.cell(row);
  }

  if (value === null || value === undefined) {
    return <span className="text-text-muted">—</span>;
  }

  let content: React.ReactNode;

  switch (column.format) {
    case "badge":
      content = <BadgeCell value={String(value)} config={column.badge} />;
      break;
    case "boolean":
      content = <BooleanCell value={Boolean(value)} />;
      break;
    case "currency":
      content = <CurrencyCell value={Number(value)} prefix={column.currencyPrefix} />;
      break;
    case "date":
      content = <DateCell value={String(value)} />;
      break;
    case "relative":
      content = <RelativeCell value={String(value)} />;
      break;
    case "image":
      content = <ImageCell value={String(value)} />;
      break;
    case "video":
      content = <VideoCell value={String(value)} />;
      break;
    case "file":
      // FileRef object — single uploaded file. The column key points to a
      // JSON column on the row, so value is the parsed FileRef (or null).
      content = <FileRefCell value={value as FileRefLike | null} />;
      break;
    case "files":
      // FileRef[] — multi-file gallery. Show a compact stack of thumbnails.
      content = <FileRefsCell value={(value as FileRefLike[]) ?? []} />;
      break;
    case "link":
      content = <LinkCell value={String(value)} />;
      break;
    case "email":
      content = <EmailCell value={String(value)} />;
      break;
    case "color":
      content = <ColorCell value={String(value)} />;
      break;
    case "richtext":
      content = <RichTextCell value={String(value)} />;
      break;
    case "user":
      // v3.31.5: packed avatar + name + email cell. Pulls the related
      // fields off the row so a single column shows everything you'd
      // otherwise spread across 3-4 columns.
      content = <UserCellInline row={row} />;
      break;
    default:
      content = <span>{String(value)}</span>;
  }

  if (column.className) {
    return <span className={column.className}>{content}</span>;
  }
  return content;
}

function UserCellInline({ row }: { row: Record<string, unknown> }) {
  const first = (row.first_name as string) || "";
  const last = (row.last_name as string) || "";
  const email = (row.email as string) || "";
  const avatar = (row.avatar as string) || "";
  const fullName = [first, last].filter(Boolean).join(" ") || (email || "User");
  const initials = ((first[0] || "") + (last[0] || "")).toUpperCase() || "U";
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-border bg-bg-elevated text-xs font-semibold text-foreground overflow-hidden">
        {avatar ? <img src={avatar} alt={fullName} className="h-full w-full object-cover" /> : initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{fullName}</p>
        {email && <p className="truncate text-xs text-text-muted">{email}</p>}
      </div>
    </div>
  );
}

function BadgeCell({
  value,
  config,
}: {
  value: string;
  config?: Record<string, { color: string; label: string }>;
}) {
  const badge = config?.[value];
  if (!badge) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-bg-hover text-text-secondary">
        {value}
      </span>
    );
  }

  const colorMap: Record<string, string> = {
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
    muted: "bg-bg-hover text-text-secondary",
    green: "bg-success/10 text-success",
    red: "bg-danger/10 text-danger",
    yellow: "bg-warning/10 text-warning",
    blue: "bg-info/10 text-info",
  };

  const className = colorMap[badge.color] ?? "bg-bg-hover text-text-secondary";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {badge.label}
    </span>
  );
}

function BooleanCell({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-success">
      <Check className="h-3.5 w-3.5" />
      <span className="text-xs">Active</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-text-muted">
      <X className="h-3.5 w-3.5" />
      <span className="text-xs">Inactive</span>
    </span>
  );
}

function CurrencyCell({ value, prefix = "$" }: { value: number; prefix?: string }) {
  return <span className="font-mono text-sm">{formatCurrency(value, prefix)}</span>;
}

function DateCell({ value }: { value: string }) {
  return <span className="text-text-secondary text-sm">{formatDate(value)}</span>;
}

function RelativeCell({ value }: { value: string }) {
  return <span className="text-text-secondary text-sm">{formatRelative(value)}</span>;
}

function ImageCell({ value }: { value: string }) {
  // Guard empty/invalid values — rendering <img src=""> makes the browser
  // re-request the whole page and logs a console warning.
  if (!value || value === "null" || value === "undefined") {
    return <span className="text-text-muted">—</span>;
  }
  return (
    <img
      src={value}
      alt=""
      className="h-8 w-8 rounded-full object-cover border border-border"
    />
  );
}

function VideoCell({ value }: { value: string }) {
  if (!value || value === "null" || value === "undefined") {
    return <span className="text-text-muted">—</span>;
  }
  return (
    <div className="relative h-10 w-16 rounded overflow-hidden bg-bg-tertiary">
      <video src={value} className="h-full w-full object-cover" muted />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <Play className="h-3.5 w-3.5 text-white fill-white" />
      </div>
    </div>
  );
}

// v3.31.30 — FileRef-aware table cells. The Go side stores a FileRef
// JSON object in the column; the cell renders a thumbnail for images,
// a generic-by-MIME icon for everything else.

type FileRefLike = {
  url: string;
  name: string;
  mime: string;
  size?: number;
  thumbnail_url?: string;
};

function FileRefCell({ value }: { value: FileRefLike | null }) {
  if (!value || !value.url) {
    return <span className="text-text-muted">—</span>;
  }
  const isImage = value.mime?.startsWith("image/");
  if (isImage) {
    return (
      <img
        src={value.thumbnail_url || value.url}
        alt={value.name}
        title={value.name}
        className="h-8 w-8 rounded object-cover border border-border"
      />
    );
  }
  return (
    <a
      href={value.url}
      target="_blank"
      rel="noopener noreferrer"
      title={value.name}
      className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      <span className="truncate max-w-[140px]">{value.name}</span>
    </a>
  );
}

function FileRefsCell({ value }: { value: FileRefLike[] }) {
  if (!value || value.length === 0) {
    return <span className="text-text-muted">—</span>;
  }
  // Stack the first 3 thumbnails, then a "+N" overflow chip.
  const visible = value.slice(0, 3);
  const overflow = value.length - visible.length;
  return (
    <div className="flex items-center gap-1">
      {visible.map((f, i) => {
        const isImage = f.mime?.startsWith("image/");
        if (isImage) {
          return (
            <img
              key={i}
              src={f.thumbnail_url || f.url}
              alt={f.name}
              title={f.name}
              className="h-8 w-8 rounded object-cover border border-border"
            />
          );
        }
        return (
          <span
            key={i}
            title={f.name}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-bg-tertiary text-[10px] font-semibold text-text-muted"
          >
            FILE
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="text-xs font-medium text-text-muted ml-1">
          +{overflow}
        </span>
      )}
    </div>
  );
}

function LinkCell({ value }: { value: string }) {
  let hostname = value;
  try {
    hostname = new URL(value).hostname;
  } catch {
    // use raw value if not a valid URL
  }
  return (
    <a
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
    >
      {hostname}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function EmailCell({ value }: { value: string }) {
  return (
    <a
      href={`mailto:${value}`}
      className="text-sm text-accent hover:underline"
    >
      {value}
    </a>
  );
}

function ColorCell({ value }: { value: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="h-5 w-5 rounded-full border border-border shrink-0"
        style={{ backgroundColor: value }}
      />
      <span className="font-mono text-xs text-text-secondary">{value}</span>
    </div>
  );
}

function RichTextCell({ value }: { value: string }) {
  const stripped = value.replace(/<[^>]*>/g, "").trim();
  const truncated = stripped.length > 100 ? stripped.slice(0, 100) + "..." : stripped;
  return <span className="text-text-secondary">{truncated}</span>;
}
