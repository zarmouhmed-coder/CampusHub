import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Pagination({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}) {
  if (total <= limit) return null;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
      <span className="text-muted-foreground">
        Page {page} sur {pages} · {total} éléments
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          <ChevronLeft /> Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onChange(offset + limit)}
        >
          Suivant <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
