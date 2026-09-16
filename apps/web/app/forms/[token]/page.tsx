"use client";

// v3.31.43+: ShareInfo carries the resource's actual field shape
// (built server-side by services.PublicFields). v3.31.50 adds
// operator-customised title + description and respects the
// hidden_fields list -- so this page no longer renders a hardcoded
// name/email/phone/message contact form. Whatever fields the
// resource's struct tags expose are what the visitor sees.

import { useEffect, useState, use } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface PageProps {
  params: Promise<{ token: string }>;
}

type PublicFieldType =
  | "text"
  | "email"
  | "tel"
  | "textarea"
  | "number"
  | "checkbox"
  | "date"
  | "datetime"
  | "file";

interface PublicField {
  key: string;
  label: string;
  type: PublicFieldType;
  required: boolean;
}

interface ShareInfo {
  resource_name: string;
  has_password: boolean;
  label: string;
  custom_title: string;
  custom_description: string;
  fields: PublicField[];
}

export default function PublicFormPage({ params }: PageProps) {
  const { token } = use(params);
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(API_URL + "/api/public/forms/" + token)
      .then((res) => setInfo(res.data.data))
      .catch((err) => {
        setError(err?.response?.data?.error?.message || "Link not found or disabled");
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-sm text-slate-500">Loading…</div>
      </main>
    );
  }

  if (error || !info) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Link unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error ?? "Unknown error"}</p>
        </div>
      </main>
    );
  }

  // v3.31.50 -- title falls back through three sources:
  //   1. operator-set custom_title (best)
  //   2. operator-set label (legacy -- pre-v3.31.50 shares)
  //   3. resource name (worst -- bare default)
  const title =
    info.custom_title?.trim() ||
    info.label?.trim() ||
    info.resource_name + " submission";
  const description =
    info.custom_description?.trim() ||
    "Fill out the form below to submit a new " + info.resource_name + ".";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>

        <PublicForm token={token} info={info} />
      </div>
    </main>
  );
}

interface PublicFormProps {
  token: string;
  info: ShareInfo;
}

function PublicForm({ token, info }: PublicFormProps) {
  const [password, setPassword] = useState("");
  // Mixed value types so checkbox + number fields can survive the
  // round-trip without coercion ceremony at submit time.
  const [fields, setFields] = useState<Record<string, string | number | boolean>>(() => {
    const initial: Record<string, string | number | boolean> = {};
    for (const f of info.fields) {
      initial[f.key] = f.type === "checkbox" ? false : "";
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, value: string | number | boolean) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Strip file fields -- not supported on public shares yet
      // (auth-gated /api/uploads endpoint). Sending them would
      // confuse the dispatcher's typed unmarshal.
      const payload: Record<string, string | number | boolean> = {};
      for (const f of info.fields) {
        if (f.type === "file") continue;
        payload[f.key] = fields[f.key];
      }
      await axios.post(API_URL + "/api/public/forms/" + token + "/submit", {
        _password: password,
        fields: payload,
      });
      setDone(true);
    } catch (err) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
        <p className="font-medium">Thank you</p>
        <p className="mt-1">Your submission was received.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {info.has_password && (
        <Field
          field={{ key: "_password", label: "Password", type: "text", required: true }}
          inputType="password"
          value={password}
          onChange={(v) => setPassword(String(v))}
          hint="This form is password-protected — ask whoever shared the link."
        />
      )}

      {info.fields.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          This resource has no public-form fields registered on the API.
          Ask the operator to re-generate the resource so the form-share
          dispatcher picks up the field schema.
        </div>
      )}

      {info.fields.map((f) => (
        <Field
          key={f.key}
          field={f}
          value={fields[f.key] ?? (f.type === "checkbox" ? false : "")}
          onChange={(v) => update(f.key, v)}
        />
      ))}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}

interface FieldProps {
  field: PublicField;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
  inputType?: string;
  hint?: string;
}

function Field({ field, value, onChange, inputType, hint }: FieldProps) {
  const labelClass = "block text-sm font-medium text-slate-700";
  const inputClass =
    "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10";

  if (field.type === "file") {
    return (
      <div className="space-y-1.5">
        <label className={labelClass}>{field.label}</label>
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
          File uploads aren&apos;t supported on public-share forms.
          {field.required
            ? " The operator must collect this file through a different channel."
            : " You can leave this blank."}
        </div>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <label className={labelClass}>
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <textarea
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          rows={4}
          className={inputClass}
        />
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </label>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="space-y-1.5">
        <label className={labelClass}>
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <input
          type="number"
          value={value === "" ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          required={field.required}
          className={inputClass}
        />
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }

  const htmlType =
    inputType ??
    (field.type === "email"
      ? "email"
      : field.type === "tel"
        ? "tel"
        : field.type === "date"
          ? "date"
          : field.type === "datetime"
            ? "datetime-local"
            : "text");

  return (
    <div className="space-y-1.5">
      <label className={labelClass}>
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        type={htmlType}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        className={inputClass}
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
