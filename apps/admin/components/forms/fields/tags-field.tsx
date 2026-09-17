"use client";

import { useState } from "react";
import type { FieldDefinition } from "@/lib/resource";
import { X } from "@/lib/icons";

interface TagsFieldProps {
  field: FieldDefinition;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

// Free-text chip input for a string[] field (category tags, tech stack,
// feature bullets, ...) — Enter or "," commits the current text as a tag.
// Distinct from CheckboxGroupField, whose options are a fixed, predefined set.
export function TagsField({ field, value, onChange, error }: TagsFieldProps) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setDraft("");
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-danger ml-1">*</span>}
      </label>
      <div
        className={
          "flex flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 " +
          (error ? "border-danger" : "border-border")
        }
      >
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={`Remove ${tag}`}
              className="rounded-full hover:bg-brand/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
              removeAt(value.length - 1);
            }
          }}
          onBlur={commit}
          placeholder={field.placeholder ?? "Type and press Enter"}
          className="min-w-[8rem] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-subtle"
        />
      </div>
      {field.description && !error && (
        <p className="text-xs text-foreground-subtle">{field.description}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
