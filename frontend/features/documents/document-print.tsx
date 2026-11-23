"use client";

import { Printer } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { Logo, LogoMark } from "@/components/layout/logo";
import { ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultsPanel } from "@/features/results/results-panel";
import { useI18n } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { useFormat } from "@/lib/use-format";
import type { IssuedDocument } from "@/types/api";

function QrCode({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: "M" }).then(setSrc, () =>
      setSrc(null),
    );
  }, [url]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className="size-28" /> : <Skeleton className="size-28" />;
}

/** Printable official document, with its verification code and QR code. */
export function DocumentPrintView({ documentId }: { documentId: string }) {
  const { t } = useI18n();
  const d = t.campus.documents;
  const fmt = useFormat();
  const doc = useApi<IssuedDocument>(`/documents/${documentId}`);
  if (doc.isPending) return <Skeleton className="h-96 rounded-2xl" />;
  if (doc.isError) return <ErrorState error={doc.error} />;
  const data = doc.data;
  const verifyUrl = `${window.location.origin}/verify/${data.code}`;
  const student = data.payload.student;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
        {data.revoked_at ? (
          <Badge variant="danger">{d.revoked}</Badge>
        ) : (
          <Badge variant="success">{d.valid}</Badge>
        )}
        <Button onClick={() => window.print()}>
          <Printer /> {t.campus.common.print}
        </Button>
      </div>
      <article className="flat rounded-2xl p-6 sm:p-10 print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b pb-5">
          <div className="flex items-center gap-3">
            <LogoMark className="size-12" />
            <div>
              <p className="font-display text-xl font-semibold">{data.payload.institution.name}</p>
              <p className="text-muted-foreground text-xs">
                {d.issuedAt} {fmt.longDate(data.issued_at)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <QrCode url={verifyUrl} />
          </div>
        </header>
        <h1 className="font-display mt-6 text-center text-2xl font-semibold tracking-tight">
          {d.kinds[data.kind]}
        </h1>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">{d.holder}</dt>
            <dd className="font-semibold">{student.first_name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t.campus.people.studentNumber}</dt>
            <dd className="font-semibold">{student.student_number ?? student.email}</dd>
          </div>
        </dl>
        <div className="mt-6">
          {data.kind === "transcript" && data.payload.results ? (
            <ResultsPanel results={data.payload.results} />
          ) : (
            <ul className="grid gap-3">
              {data.payload.enrollments?.map((e) => (
                <li
                  key={`${e.cohort}-${e.academic_year}`}
                  className="bg-surface rounded-xl px-4 py-3 text-[0.95rem] leading-relaxed"
                >
                  {d.certifyText(
                    student.first_name,
                    e.program,
                    e.level ?? "",
                    e.cohort,
                    e.academic_year,
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="text-muted-foreground mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs">
          <span>
            {d.code} : <strong className="text-foreground font-mono">{data.code}</strong>
          </span>
          <span>
            {d.verifyAt} {window.location.host}/verify
          </span>
          <Logo className="scale-75" />
        </footer>
      </article>
    </div>
  );
}
