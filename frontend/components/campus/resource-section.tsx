"use client";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ListSkeleton } from "@/components/states";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { api } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { useI18n } from "@/lib/i18n";
import { useApi, useApiMutation } from "@/lib/use-api";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "checkbox" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
  hint?: string;
  step?: string;
  /** Only shown when creating (e.g. the parent of a row cannot change). */
  createOnly?: boolean;
};

export type Column<T> = { label: string; render: (row: T) => React.ReactNode; className?: string };

type Values = Record<string, string | boolean>;

/**
 * A titled table of institution resources with create / edit / delete dialogs,
 * driven by a list of fields. Used for the whole academic structure.
 */
export function ResourceSection<T extends { id: string }>({
  title,
  addLabel,
  path,
  query,
  fields,
  columns,
  invalidate = [],
  defaults = {},
  emptyText,
  canEdit = true,
  actions,
}: {
  title: string;
  addLabel: string;
  path: string;
  query?: Record<string, string | undefined>;
  fields: FieldDef[];
  columns: Column<T>[];
  invalidate?: string[];
  defaults?: Values;
  emptyText?: string;
  canEdit?: boolean;
  actions?: (row: T) => React.ReactNode;
}) {
  const { t } = useI18n();
  const list = useApi<T[]>(path, query);
  const [editing, setEditing] = useState<T | null | undefined>(undefined); // undefined = closed
  const [deleting, setDeleting] = useState<T | null>(null);
  const remove = useApiMutation((id: string) => api.delete(`${path}/${id}`), {
    invalidate: [path, ...invalidate],
    success: t.campus.common.deleted,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {canEdit && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
            <Plus /> {addLabel}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {list.isPending ? (
          <ListSkeleton rows={2} />
        ) : !list.data || list.data.length === 0 ? (
          <p className="bg-surface text-muted-foreground rounded-lg px-3 py-4 text-center text-sm">
            {emptyText ?? t.campus.common.empty}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableHead key={c.label} className={c.className}>
                    {c.label}
                  </TableHead>
                ))}
                {canEdit && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((c) => (
                    <TableCell key={c.label} className={c.className}>
                      {c.render(row)}
                    </TableCell>
                  ))}
                  {canEdit && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t.campus.common.actions}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions?.(row)}
                          <DropdownMenuItem onSelect={() => setEditing(row)}>
                            <Pencil /> {t.common.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(row)}>
                            <Trash2 /> {t.common.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ResourceForm
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? `${t.common.edit} — ${title.toLowerCase()}` : addLabel}
        path={path}
        row={editing ?? null}
        fields={fields}
        defaults={defaults}
        invalidate={[path, ...invalidate]}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t.campus.common.deleteTitle}
        description={t.campus.common.deleteText}
        onConfirm={() => remove.mutateAsync(deleting!.id)}
      />
    </Card>
  );
}

function toValues(
  fields: FieldDef[],
  row: Record<string, unknown> | null,
  defaults: Values,
): Values {
  const values: Values = {};
  for (const f of fields) {
    const raw = row?.[f.name] ?? defaults[f.name];
    values[f.name] =
      f.type === "checkbox" ? Boolean(raw) : raw === null || raw === undefined ? "" : String(raw);
  }
  return values;
}

function toBody(fields: FieldDef[], values: Values, editing: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of fields) {
    if (editing && f.createOnly) continue;
    const v = values[f.name];
    if (f.type === "checkbox") body[f.name] = Boolean(v);
    else if (v === "" || v === undefined) body[f.name] = null;
    else if (f.type === "number") body[f.name] = Number(v);
    else body[f.name] = v;
  }
  return body;
}

function ResourceForm({
  open,
  onClose,
  title,
  path,
  row,
  fields,
  defaults,
  invalidate,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  path: string;
  row: { id: string } | null;
  fields: FieldDef[];
  defaults: Values;
  invalidate: string[];
}) {
  const { t } = useI18n();
  const form = useForm<Values>({ defaultValues: toValues(fields, null, defaults) });
  const { errors, isSubmitting } = form.formState;
  const save = useApiMutation(
    (body: Record<string, unknown>) =>
      row ? api.patch(`${path}/${row.id}`, body) : api.post(path, body),
    { invalidate, success: t.campus.common.saved },
  );

  useEffect(() => {
    if (open) form.reset(toValues(fields, row as Record<string, unknown> | null, defaults));
  }, [open, row, fields, defaults, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(toBody(fields, values, row !== null));
      onClose();
    } catch (error) {
      applyApiError(
        error,
        form.setError,
        fields.map((f) => f.name),
        t,
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <div className="grid gap-4 sm:grid-cols-2">
            {fields
              .filter((f) => !(row && f.createOnly))
              .map((f) => {
                const id = `res-${f.name}`;
                const error = errors[f.name]?.message as string | undefined;
                const rules = f.required ? { required: t.validation.invalid } : {};
                if (f.type === "checkbox") {
                  return (
                    <label
                      key={f.name}
                      className="flex items-center gap-2 text-sm font-medium sm:col-span-2"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--primary)]"
                        {...form.register(f.name)}
                      />
                      {f.label}
                    </label>
                  );
                }
                return (
                  <Field
                    key={f.name}
                    id={id}
                    label={f.label}
                    hint={f.hint}
                    error={error}
                    optional={!f.required}
                  >
                    {f.type === "select" ? (
                      <NativeSelect {...fieldA11y(id, error)} {...form.register(f.name, rules)}>
                        <option value="">{t.campus.common.select}</option>
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </NativeSelect>
                    ) : (
                      <Input
                        type={f.type ?? "text"}
                        step={f.step}
                        {...fieldA11y(id, error)}
                        {...form.register(f.name, rules)}
                      />
                    )}
                  </Field>
                );
              })}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
