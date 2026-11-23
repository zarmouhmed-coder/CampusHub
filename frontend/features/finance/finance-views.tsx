"use client";

import {
  AlertTriangle,
  Banknote,
  ChevronDown,
  Info,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Fragment, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { RequireRole } from "@/components/campus/guard";
import { Stat } from "@/components/campus/stat";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStructure } from "@/features/school/use-structure";
import { useDateOnly, useMoney } from "@/lib/format";
import { applyApiError } from "@/lib/form-errors";
import { useI18n } from "@/lib/i18n";
import { api, useApi, useApiMutation } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import type { FinanceSummary, InvoiceItem, Member, PaymentMethod } from "@/types/api";

const STATUS_BADGE = {
  paid: "success",
  partial: "warning",
  unpaid: "neutral",
  overdue: "danger",
} as const;
const METHODS: PaymentMethod[] = ["mobile_money", "cash", "bank_transfer", "card", "other"];
const today = () => new Date().toISOString().slice(0, 10);

type InvoiceValues = {
  target: "student" | "cohort";
  student_id: string;
  cohort_id: string;
  label: string;
  amount: string;
  due_on: string;
};

function NewInvoice({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const f = t.campus.finance;
  const ref = useStructure();
  const students = useApi<Member[]>(open ? "/school/members" : null, { role: "student" });
  const [target, setTarget] = useState<"student" | "cohort">("cohort");
  const form = useForm<InvoiceValues>({
    values: { target, student_id: "", cohort_id: "", label: "", amount: "", due_on: "" },
  });
  const create = useApiMutation(
    (v: InvoiceValues) =>
      target === "cohort"
        ? api.post<InvoiceItem[]>("/school/invoices/bulk", {
            cohort_id: v.cohort_id,
            label: v.label,
            amount: Number(v.amount),
            due_on: v.due_on || null,
          })
        : api
            .post<InvoiceItem>("/school/invoices", {
              student_id: v.student_id,
              label: v.label,
              amount: Number(v.amount),
              due_on: v.due_on || null,
            })
            .then((i) => [i]),
    { invalidate: ["/school/invoices", "/school/finance", "/school/overview"] },
  );
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const created = await create.mutateAsync(v);
      toast.success(f.invoicesCreated(created.length));
      form.reset();
      onClose();
    } catch (error) {
      applyApiError(error, form.setError, ["label", "amount", "student_id", "cohort_id"], t);
    }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{f.newInvoice}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <Segmented
            label={f.target}
            value={target}
            onChange={setTarget}
            options={[
              { value: "cohort", label: f.wholeCohort },
              { value: "student", label: f.oneStudent },
            ]}
          />
          {target === "cohort" ? (
            <Field id="inv-cohort" label={t.campus.common.cohort}>
              <NativeSelect
                id="inv-cohort"
                {...form.register("cohort_id", { required: t.validation.invalid })}
              >
                <option value="">{t.campus.common.select}</option>
                {ref.options(ref.cohorts.data).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : (
            <Field id="inv-student" label={t.campus.common.student}>
              <NativeSelect
                id="inv-student"
                {...form.register("student_id", { required: t.validation.invalid })}
              >
                <option value="">{t.campus.common.select}</option>
                {students.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} — {s.student_number ?? s.email}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field id="inv-label" label={f.label} error={errors.label?.message}>
            <Input
              placeholder="Scolarité — Semestre 1"
              {...fieldA11y("inv-label", errors.label?.message)}
              {...form.register("label", { required: t.validation.invalid })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="inv-amount" label={f.amount} error={errors.amount?.message}>
              <Input
                type="number"
                min="1"
                step="1"
                {...fieldA11y("inv-amount", errors.amount?.message)}
                {...form.register("amount", { required: t.validation.invalid })}
              />
            </Field>
            <Field id="inv-due" label={f.dueOn} optional>
              <Input id="inv-due" type="date" {...form.register("due_on")} />
            </Field>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {f.newInvoice}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type PaymentValues = { amount: string; method: PaymentMethod; reference: string; paid_on: string };

function RecordPayment({ invoice, onClose }: { invoice: InvoiceItem | null; onClose: () => void }) {
  const { t } = useI18n();
  const f = t.campus.finance;
  const money = useMoney();
  const form = useForm<PaymentValues>({
    values: {
      amount: invoice ? String(invoice.balance) : "",
      method: "mobile_money",
      reference: "",
      paid_on: today(),
    },
  });
  const pay = useApiMutation(
    (v: PaymentValues) =>
      api.post(`/school/invoices/${invoice!.id}/payments`, {
        ...v,
        amount: Number(v.amount),
        reference: v.reference || null,
      }),
    {
      invalidate: ["/school/invoices", "/school/finance", "/school/overview"],
      success: f.paymentRecorded,
    },
  );
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await pay.mutateAsync(v);
      onClose();
    } catch (error) {
      applyApiError(error, form.setError, ["amount", "reference", "paid_on"], t, {
        overpayment: "amount",
      });
    }
  });
  return (
    <Dialog open={invoice !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{invoice ? f.paymentTitle(invoice.label) : ""}</DialogTitle>
        </DialogHeader>
        {invoice && (
          <form onSubmit={onSubmit} noValidate className="grid gap-4">
            <p className="text-muted-foreground text-sm">
              {invoice.student.name} · {f.balance} :{" "}
              <strong className="text-foreground">{money(invoice.balance)}</strong>
            </p>
            <FormError message={errors.root?.server?.message} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="pay-amount" label={f.amount} error={errors.amount?.message}>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  {...fieldA11y("pay-amount", errors.amount?.message)}
                  {...form.register("amount", { required: t.validation.invalid })}
                />
              </Field>
              <Field id="pay-method" label={f.method}>
                <NativeSelect id="pay-method" {...form.register("method")}>
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {f.methods[m]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="pay-ref" label={f.reference} hint={f.referenceHint} optional>
                <Input id="pay-ref" maxLength={100} {...form.register("reference")} />
              </Field>
              <Field id="pay-date" label={f.paidOn}>
                <Input
                  id="pay-date"
                  type="date"
                  {...form.register("paid_on", { required: true })}
                />
              </Field>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="secondary" onClick={onClose}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {f.recordPayment}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvoicesTable({
  invoices,
  admin,
}: {
  invoices: InvoiceItem[];
  admin?: { onPay: (i: InvoiceItem) => void; onCancel: (paymentId: string) => void };
}) {
  const { t } = useI18n();
  const f = t.campus.finance;
  const money = useMoney();
  const date = useDateOnly();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-8" />
          {admin && <TableHead>{t.campus.common.student}</TableHead>}
          <TableHead>{f.label}</TableHead>
          <TableHead className="text-right">{f.amount}</TableHead>
          <TableHead className="text-right">{f.balance}</TableHead>
          <TableHead>{f.dueOn}</TableHead>
          <TableHead>{t.campus.common.status}</TableHead>
          {admin && <TableHead className="w-28" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((i) => (
          <Fragment key={i.id}>
            <TableRow>
              <TableCell>
                {i.payments.length > 0 && (
                  <button
                    type="button"
                    aria-expanded={open === i.id}
                    aria-label={f.payments}
                    onClick={() => setOpen(open === i.id ? null : i.id)}
                  >
                    <ChevronDown
                      className={cn(
                        "text-muted-foreground size-4 transition-transform",
                        open === i.id && "rotate-180",
                      )}
                    />
                  </button>
                )}
              </TableCell>
              {admin && (
                <TableCell>
                  <p className="font-medium">{i.student.name}</p>
                  <p className="text-muted-foreground text-xs">{i.student_number ?? ""}</p>
                </TableCell>
              )}
              <TableCell className="font-medium">{i.label}</TableCell>
              <TableCell className="text-right tabular-nums">{money(i.amount)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {money(i.balance)}
              </TableCell>
              <TableCell className="text-muted-foreground">{date(i.due_on)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[i.status]}>{f.statuses[i.status]}</Badge>
              </TableCell>
              {admin && (
                <TableCell className="text-right">
                  {i.balance > 0 && (
                    <Button size="sm" onClick={() => admin.onPay(i)}>
                      <Wallet /> {f.recordPayment}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
            {open === i.id &&
              i.payments.map((p) => (
                <TableRow key={p.id} className="bg-surface/60">
                  <TableCell />
                  <TableCell colSpan={admin ? 2 : 1} className="text-sm">
                    {date(p.paid_on)} · {f.methods[p.method]}{" "}
                    {p.reference && <code className="ml-1 text-xs">{p.reference}</code>}
                  </TableCell>
                  <TableCell className="text-success-foreground text-right text-sm tabular-nums">
                    + {money(p.amount)}
                  </TableCell>
                  <TableCell colSpan={admin ? 4 : 3} className="text-right">
                    {admin && (
                      <Button size="sm" variant="ghost" onClick={() => admin.onCancel(p.id)}>
                        <X /> {f.cancelPayment}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

function AdminFinance() {
  const { t } = useI18n();
  const f = t.campus.finance;
  const money = useMoney();
  const [status, setStatus] = useState<InvoiceItem["status"] | "all">("all");
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<InvoiceItem | null>(null);
  const summary = useApi<FinanceSummary>("/school/finance/summary");
  const invoices = useApi<InvoiceItem[]>("/school/invoices", {
    status: status === "all" ? undefined : status,
  });
  const cancel = useApiMutation((id: string) => api.delete(`/school/payments/${id}`), {
    invalidate: ["/school/invoices", "/school/finance", "/school/overview"],
    success: t.campus.common.deleted,
  });
  const statuses = [
    { value: "all", label: t.campus.common.all },
    ...(["overdue", "unpaid", "partial", "paid"] as const).map((s) => ({
      value: s,
      label: f.statuses[s],
    })),
  ];
  return (
    <>
      <PageHeader
        title={f.title}
        description={f.subtitle}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> {f.newInvoice}
          </Button>
        }
      />
      {summary.data && (
        <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-5">
          <Stat label={f.billed} value={money(summary.data.billed)} icon={Receipt} />
          <Stat
            label={f.collected}
            value={money(summary.data.collected)}
            icon={Banknote}
            tone="success"
          />
          <Stat
            label={f.outstanding}
            value={money(summary.data.outstanding)}
            icon={Wallet}
            tone="gold"
          />
          <Stat
            label={f.overdue}
            value={money(summary.data.overdue)}
            icon={AlertTriangle}
            tone="danger"
          />
          <Stat
            label={f.collectionRate}
            value={
              summary.data.collection_rate === null ? "—" : `${summary.data.collection_rate} %`
            }
            icon={TrendingUp}
          />
        </div>
      )}
      <Segmented
        label={t.campus.common.status}
        value={status}
        onChange={(v) => setStatus(v as typeof status)}
        options={statuses}
        className="mb-4"
      />
      {invoices.isPending ? (
        <ListSkeleton />
      ) : invoices.isError ? (
        <ErrorState error={invoices.error} onRetry={() => invoices.refetch()} />
      ) : invoices.data.length === 0 ? (
        <EmptyState icon={Receipt} title={f.noInvoices} />
      ) : (
        <InvoicesTable
          invoices={invoices.data}
          admin={{ onPay: setPaying, onCancel: (id) => cancel.mutate(id) }}
        />
      )}
      <NewInvoice open={creating} onClose={() => setCreating(false)} />
      <RecordPayment key={paying?.id ?? "none"} invoice={paying} onClose={() => setPaying(null)} />
    </>
  );
}

export function AdminFinanceView() {
  return (
    <RequireRole roles={["admin"]} module="finance">
      {() => <AdminFinance />}
    </RequireRole>
  );
}

function MyFees() {
  const { t } = useI18n();
  const f = t.campus.finance;
  const money = useMoney();
  const invoices = useApi<InvoiceItem[]>("/me/invoices");
  const due = (invoices.data ?? []).reduce((sum, i) => sum + i.balance, 0);
  return (
    <>
      <PageHeader title={f.myTitle} description={f.mySubtitle} />
      {invoices.isPending ? (
        <ListSkeleton />
      ) : invoices.isError ? (
        <ErrorState error={invoices.error} onRetry={() => invoices.refetch()} />
      ) : invoices.data.length === 0 ? (
        <EmptyState icon={Receipt} title={f.noInvoices} />
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <Stat
              label={f.totalDue}
              value={money(due)}
              icon={Wallet}
              tone={due > 0 ? "gold" : "success"}
            />
            <p className="soft text-muted-foreground flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm">
              <Info className="text-primary mt-0.5 size-4 shrink-0" /> {f.howToPay}
            </p>
          </div>
          <InvoicesTable invoices={invoices.data} />
        </div>
      )}
    </>
  );
}

export function MyFeesView() {
  return (
    <RequireRole roles={["student"]} module="finance">
      {() => <MyFees />}
    </RequireRole>
  );
}
