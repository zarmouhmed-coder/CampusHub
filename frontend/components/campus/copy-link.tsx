"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

/** A link to hand over (e-mail, WhatsApp…), with a copy button. */
export function CopyLink({ url, label }: { url: string; label?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-1.5">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="soft-inset flex items-center gap-2 rounded-lg py-1 pr-1 pl-3">
        <code className="min-w-0 flex-1 truncate text-xs">{url}</code>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success(t.campus.common.copied);
          }}
        >
          {copied ? <Check /> : <Copy />} {t.campus.common.copy}
        </Button>
      </div>
    </div>
  );
}
