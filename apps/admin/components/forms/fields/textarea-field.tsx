import type { FieldDefinition } from "@/lib/resource";

interface TextareaFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function TextareaField({ field, value, onChange, error }: TextareaFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-danger ml-1">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={field.rows ?? 4}
        className={`w-full rounded-lg border border-border bg-foreground/5 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-y ${error ? "border-danger" : ""}`}
      />
      {field.description && !error && (
        <p className="text-xs text-foreground-subtle">{field.description}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
