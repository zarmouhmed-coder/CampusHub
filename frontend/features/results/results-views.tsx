"use client";

import { FileBadge, ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { RequireRole } from "@/components/campus/guard";
import { ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { api, useApi, useApiMutation } from "@/lib/use-api";
import type { Institution, IssuedDocument, Member, StudentResults } from "@/types/api";

import { ResultsPanel } from "./results-panel";

function MyResults() {
  const { t } = useI18n();
  const results = useApi<StudentResults>("/me/results");
  return (
    <>
      <PageHeader title={t.campus.results.myTitle} description={t.campus.results.mySubtitle} />
      {results.isPending ? (
        <ListSkeleton rows={3} />
      ) : results.isError ? (
        <ErrorState error={results.error} onRetry={() => results.refetch()} />
      ) : (
        <ResultsPanel results={results.data} />
      )}
    </>
  );
}

export function MyResultsView() {
  return (
    <RequireRole roles={["student"]} module="grades">
      {() => <MyResults />}
    </RequireRole>
  );
}

/** "?student=<id>" read on the client (no Suspense swap needed). */
function useStudentParam() {
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("student") ?? "",
    () => "",
  );
}

function AdminResults({ institution }: { institution: Institution }) {
  const { t } = useI18n();
  const r = t.campus.results;
  const router = useRouter();
  const fromUrl = useStudentParam();
  const [picked, setPicked] = useState<string | null>(null);
  const student = picked ?? fromUrl;
  const students = useApi<Member[]>("/school/members", { role: "student" });
  const results = useApi<StudentResults>(student ? `/school/students/${student}/results` : null);
  const documents = institution.modules.includes("documents");
  const issue = useApiMutation(
    (kind: IssuedDocument["kind"]) =>
      api.post<IssuedDocument>("/school/documents", { student_id: student, kind }),
    { invalidate: ["/school/documents"], success: r.issued },
  );
  const issueAndOpen = async (kind: IssuedDocument["kind"]) => {
    const doc = await issue.mutateAsync(kind);
    router.push(`/documents/${doc.id}`);
  };

  return (
    <>
      <PageHeader
        title={r.adminTitle}
        description={r.adminSubtitle}
        actions={
          documents && student ? (
            <>
              <Button
                variant="secondary"
                disabled={issue.isPending}
                onClick={() => issueAndOpen("enrollment_certificate")}
              >
                <FileBadge /> {r.issueCertificate}
              </Button>
              <Button
                disabled={issue.isPending || !results.data?.periods.length}
                onClick={() => issueAndOpen("transcript")}
              >
                <ScrollText /> {r.issueTranscript}
              </Button>
            </>
          ) : undefined
        }
      />
      <Field id="results-student" label={r.pickStudent} className="mb-5 max-w-md">
        <NativeSelect
          id="results-student"
          value={student}
          onChange={(e) => setPicked(e.target.value)}
        >
          <option value="">{t.campus.common.select}</option>
          {students.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.first_name} — {s.student_number ?? s.email}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {student &&
        (results.isPending ? (
          <ListSkeleton rows={3} />
        ) : results.isError ? (
          <ErrorState error={results.error} onRetry={() => results.refetch()} />
        ) : (
          <ResultsPanel results={results.data} />
        ))}
    </>
  );
}

export function AdminResultsView() {
  return (
    <RequireRole roles={["admin"]} module="grades">
      {({ institution }) => <AdminResults institution={institution} />}
    </RequireRole>
  );
}
