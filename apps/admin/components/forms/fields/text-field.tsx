import type { FieldDefinition } from "@/lib/resource";
import { GenerateButton } from "./generate-button";

interface TextFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** When set, renders a Generate button in the label row (see FieldDefinition.generate). */
  onGenerate?: () => void | Promise<void>;
}

export function TextField({ field, value, onChange, error, onGenerate }: TextFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-medium text-foreground">
          {field.label}
          {field.required && <span className="text-danger ml-1">*</span>}
        </label>
        {onGenerate && <GenerateButton onGenerate={onGenerate} />}
      </div>

      <div className="flex">
        {field.prefix && (
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border bg-foreground/5 px-3 text-sm text-foreground-subtle">
            {field.prefix}
          </span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`w-full ${field.prefix ? "rounded-r-lg" : field.suffix ? "rounded-l-lg" : "rounded-lg"} border border-border bg-foreground/5 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${error ? "border-danger" : ""}`}
        />
        {field.suffix && (
          <span className="inline-flex items-center rounded-r-lg border border-l-0 border-border bg-foreground/5 px-3 text-sm text-foreground-subtle">
            {field.suffix}
          </span>
        )}
      </div>

      {field.description && !error && (
        <p className="text-xs text-foreground-subtle">{field.description}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
