"use client";

import { useState } from "react";
import { Mail } from "@/lib/icons";

const templates = [
  {
    name: "welcome",
    label: "Welcome Email",
    description: "Sent when a new user registers",
    sampleData: {
      AppName: "MyApp",
      Name: "John Doe",
      DashboardURL: "http://localhost:3000/dashboard",
      Year: new Date().getFullYear(),
    },
  },
  {
    name: "password-reset",
    label: "Password Reset",
    description: "Sent when a user requests a password reset",
    sampleData: {
      AppName: "MyApp",
      ResetURL: "http://localhost:3000/reset-password?token=abc123",
      Year: new Date().getFullYear(),
    },
  },
  {
    name: "email-verification",
    label: "Email Verification",
    description: "Sent to verify a user's email address",
    sampleData: {
      AppName: "MyApp",
      VerifyURL: "http://localhost:3000/verify?token=abc123",
      Year: new Date().getFullYear(),
    },
  },
  {
    name: "notification",
    label: "Notification",
    description: "General purpose notification email",
    sampleData: {
      AppName: "MyApp",
      Title: "New Activity",
      Message: "Someone commented on your post. Check it out!",
      ActionURL: "http://localhost:3000/activity",
      ActionText: "View Activity",
      Year: new Date().getFullYear(),
    },
  },
];

export default function MailPage() {
  const [selected, setSelected] = useState(templates[0]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Email Templates</h1>
        <p className="text-sm text-text-secondary mt-1">Preview email templates with sample data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template selector */}
        <div className="space-y-2">
          {templates.map((t) => (
            <button
              key={t.name}
              onClick={() => setSelected(t)}
              className={`w-full text-left rounded-xl border p-4 transition-colors ${
                selected.name === t.name
                  ? "border-accent bg-accent/5"
                  : "border-border bg-bg-secondary hover:border-accent/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <Mail className={`h-4 w-4 ${selected.name === t.name ? "text-accent" : "text-text-muted"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-xs text-text-muted mt-0.5">{t.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{selected.label}</p>
                <p className="text-xs text-text-muted">Template: {selected.name}</p>
              </div>
              <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                Preview
              </span>
            </div>
            <div className="p-4">
              <div className="rounded-lg border border-border bg-[#0a0a0f] p-6">
                <div className="max-w-md mx-auto">
                  <div className="rounded-xl border border-[#2a2a3a] bg-[#111118] p-8">
                    <div className="text-center mb-6">
                      <span className="text-2xl font-bold text-[#6c5ce7]">
                        {selected.sampleData.AppName}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-[#e8e8f0] mb-3">
                      {selected.name === "welcome" && `Welcome, ${selected.sampleData.Name}!`}
                      {selected.name === "password-reset" && "Reset Your Password"}
                      {selected.name === "email-verification" && "Verify Your Email"}
                      {selected.name === "notification" && String((selected.sampleData as Record<string, unknown>).Title ?? "")}
                    </h2>
                    <p className="text-sm text-[#9090a8] mb-4 leading-relaxed">
                      {selected.name === "welcome" && "Thanks for signing up. Your account is ready to use."}
                      {selected.name === "password-reset" && "We received a request to reset your password. Click the button below to set a new one."}
                      {selected.name === "email-verification" && "Please verify your email address by clicking the button below."}
                      {selected.name === "notification" && String((selected.sampleData as Record<string, unknown>).Message ?? "")}
                    </p>
                    <div className="text-center">
                      <span className="inline-block rounded-lg bg-[#6c5ce7] px-6 py-2.5 text-sm font-semibold text-white">
                        {selected.name === "welcome" && "Go to Dashboard"}
                        {selected.name === "password-reset" && "Reset Password"}
                        {selected.name === "email-verification" && "Verify Email"}
                        {selected.name === "notification" && String((selected.sampleData as Record<string, unknown>).ActionText ?? "View")}
                      </span>
                    </div>
                  </div>
                  <p className="text-center text-xs text-[#606078] mt-4">
                    &copy; {selected.sampleData.Year} {selected.sampleData.AppName}. All rights reserved.
                  </p>
                </div>
              </div>
            </div>

            {/* Sample data */}
            <div className="border-t border-border px-4 py-3">
              <p className="text-xs font-medium text-text-muted uppercase mb-2">Template Data</p>
              <pre className="text-xs text-text-secondary font-mono bg-bg-tertiary rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(selected.sampleData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
