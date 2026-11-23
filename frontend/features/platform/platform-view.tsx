"use client";

import {
  Building2,
  GraduationCap,
  MoreHorizontal,
  PauseCircle,
  Plus,
  Settings2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { RequireRole } from "@/components/campus/guard";
import { CopyLink } from "@/components/campus/copy-link";
import { Stat, StatGrid } from "@/components/campus/stat";
import { ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyApiError } from "@/lib/form-errors";
import { useI18n } from "@/lib/i18n";
import { api, useApi, useApiMutation } from "@/lib/use-api";
import type { ModuleName, PlatformInstitution, PlatformStats } from "@/types/api";

const MODULES: ModuleName[] = [
  "grades",
  "timetable",
  "attendance",
  "finance",
  "announcements",
  "documents",
];
const PLANS = ["essential", "standard", "premium"] as const;

type CreateValues = {
  name: string;
  slug: string;
  country: string;
  locale: "fr" | "en";
  timezone: string;
  currency: string;
  plan: (typeof PLANS)[number];
  admin_email: string;
  admin_first_name: string;
};

function CreateInstitution({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const p = t.campus.platform;
  const [result, setResult] = useState<{ url: string | null } | null>(null);
  const form = useForm<CreateValues>({
    defaultValues: {
      name: "",
      slug: "",
      country: "SN",
      locale: "fr",
      timezone: "Africa/Dakar",
      currency: "XOF",
      plan: "standard",
      admin_email: "",
      admin_first_name: "",
    },
  });
  const create = useApiMutation(
    (body: CreateValues) =>
      api.post<{ invitation_url: string | null }>("/platform/institutions", {
        ...body,
        country: body.country.toUpperCase() || null,
        currency: body.currency.toUpperCase(),
        admin_first_name: body.admin_first_name || null,
      }),
    { invalidate: ["/platform"], success: p.created },
  );
  const { errors, isSubmitting } = form.formState;
  const close = () => {
    setResult(null);
    form.reset();
    onClose();
  };
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const r = await create.mutateAsync(values);
      setResult({ url: r.invitation_url });
    } catch (error) {
      applyApiError(
        error,
        form.setError,
        ["name", "slug", "country", "timezone", "currency", "admin_email"],
        t,
      );
    }
  });
  const text = (
    name: keyof CreateValues,
    label: string,
    extra: React.ComponentProps<"input"> = {},
    hint?: string,
  ) => (
    <Field id={`inst-${name}`} label={label} hint={hint} error={errors[name]?.message}>
      <Input
        {...fieldA11y(`inst-${name}`, errors[name]?.message)}
        {...extra}
        {...form.register(name, { required: !extra.placeholder ? t.validation.invalid : false })}
      />
    </Field>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{p.newInstitution}</DialogTitle>
        </DialogHeader>
        {result ? (
          <div className="grid gap-4">
            {result.url ? (
              <>
                <p className="text-muted-foreground text-sm">{p.inviteLinkText}</p>
                <CopyLink url={result.url} label={p.inviteLinkTitle} />
              </>
            ) : (
              <p className="text-sm">{p.addedExisting}</p>
            )}
            <DialogFooter>
              <Button onClick={close}>{t.common.close}</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-4">
            <FormError message={errors.root?.server?.message} />
            <div className="grid gap-4 sm:grid-cols-2">
              {text("name", t.campus.common.name)}
              {text("slug", p.slug, {}, p.slugHint)}
              {text("country", p.country, { maxLength: 2, placeholder: "SN" })}
              <Field id="inst-plan" label={p.plan}>
                <NativeSelect id="inst-plan" {...form.register("plan")}>
                  {PLANS.map((plan) => (
                    <option key={plan} value={plan}>
                      {t.campus.plans[plan]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="inst-locale" label={p.locale}>
                <NativeSelect id="inst-locale" {...form.register("locale")}>
                  <option value="fr">{t.languages.fr}</option>
                  <option value="en">{t.languages.en}</option>
                </NativeSelect>
              </Field>
              {text("currency", p.currency, { maxLength: 3 })}
              {text("timezone", p.timezone)}
              {text("admin_first_name", p.adminFirstName, { placeholder: " " })}
              <div className="sm:col-span-2">
                {text("admin_email", p.adminEmail, { type: "email" })}
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="secondary" onClick={close}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t.common.saving : p.newInstitution}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManageInstitution({
  institution,
  onClose,
}: {
  institution: PlatformInstitution | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [plan, setPlan] = useState(institution?.plan ?? "standard");
  const [modules, setModules] = useState<ModuleName[]>(institution?.modules ?? []);
  const save = useApiMutation(
    () => api.patch(`/platform/institutions/${institution!.id}`, { plan, modules }),
    { invalidate: ["/platform"], success: t.campus.platform.updated },
  );
  return (
    <Dialog open={institution !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{institution?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field id="manage-plan" label={t.campus.platform.plan}>
            <NativeSelect
              id="manage-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value as typeof plan)}
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {t.campus.plans[p]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t.campus.platform.modules}</legend>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map((m) => (
                <label
                  key={m}
                  className="soft-inset flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={modules.includes(m)}
                    onChange={(e) =>
                      setModules(
                        e.target.checked ? [...modules, m] : modules.filter((x) => x !== m),
                      )
                    }
                  />
                  {t.campus.modules[m]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate(undefined, { onSuccess: onClose })}
          >
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Institutions() {
  const { t } = useI18n();
  const p = t.campus.platform;
  const stats = useApi<PlatformStats>("/platform/stats");
  const list = useApi<PlatformInstitution[]>("/platform/institutions");
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState<PlatformInstitution | null>(null);
  const [suspending, setSuspending] = useState<PlatformInstitution | null>(null);
  const setStatus = useApiMutation(
    ({ id, status }: { id: string; status: "active" | "suspended" }) =>
      api.patch(`/platform/institutions/${id}`, { status }),
    { invalidate: ["/platform"], success: p.updated },
  );

  return (
    <>
      <PageHeader
        title={p.title}
        description={p.subtitle}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> {p.newInstitution}
          </Button>
        }
      />
      {stats.data && (
        <StatGrid className="mb-5">
          <Stat label={p.institutions} value={stats.data.institutions} icon={Building2} />
          <Stat
            label={p.active}
            value={stats.data.active_institutions}
            icon={Building2}
            tone="success"
          />
          <Stat
            label={p.suspended}
            value={stats.data.suspended_institutions}
            icon={PauseCircle}
            tone="danger"
          />
          <Stat label={p.users} value={stats.data.users} icon={Users} />
          <Stat
            label={t.campus.common.students}
            value={stats.data.students}
            icon={GraduationCap}
            tone="gold"
          />
          <Stat label={t.campus.roles.teacher} value={stats.data.teachers} icon={Users} />
        </StatGrid>
      )}
      {list.isPending ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t.campus.common.name}</TableHead>
              <TableHead>{p.members}</TableHead>
              <TableHead>{p.plan}</TableHead>
              <TableHead>{p.modules}</TableHead>
              <TableHead>{t.campus.common.status}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.map((inst) => (
              <TableRow key={inst.id}>
                <TableCell>
                  <p className="font-medium">{inst.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {inst.slug} · {inst.country ?? "—"} · {inst.currency} · {inst.timezone}
                  </p>
                </TableCell>
                <TableCell className="tabular-nums">
                  {inst.members}{" "}
                  <span className="text-muted-foreground text-xs">
                    ({inst.students} {t.campus.common.students.toLowerCase()})
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="accent">{t.campus.plans[inst.plan]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[16rem] text-xs">
                  {inst.modules.map((m) => t.campus.modules[m]).join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={inst.status === "active" ? "success" : "danger"}>
                    {inst.status === "active" ? p.active : p.suspended}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t.common.actionsFor(inst.name)}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setManaging(inst)}>
                        <Settings2 /> {p.manage}
                      </DropdownMenuItem>
                      {inst.status === "active" ? (
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setSuspending(inst)}
                        >
                          <PauseCircle /> {p.suspend}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onSelect={() => setStatus.mutate({ id: inst.id, status: "active" })}
                        >
                          <Building2 /> {p.reactivate}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <CreateInstitution open={creating} onClose={() => setCreating(false)} />
      {managing && (
        <ManageInstitution
          key={managing.id}
          institution={managing}
          onClose={() => setManaging(null)}
        />
      )}
      <ConfirmDialog
        open={suspending !== null}
        onOpenChange={(o) => !o && setSuspending(null)}
        title={p.suspendTitle(suspending?.name ?? "")}
        description={p.suspendText}
        confirmLabel={p.suspend}
        onConfirm={() => setStatus.mutateAsync({ id: suspending!.id, status: "suspended" })}
      />
    </>
  );
}

export function PlatformView() {
  return <RequireRole roles="superadmin">{() => <Institutions />}</RequireRole>;
}
