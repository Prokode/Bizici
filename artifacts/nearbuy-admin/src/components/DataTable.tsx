import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => ReactNode;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  loading,
  empty,
  onRowClick,
  testId,
}: {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  testId?: string;
}) {
  return (
    <div className="border border-card-border rounded-lg overflow-hidden bg-card" data-testid={testId}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-card-border">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "text-left font-medium text-muted-foreground px-4 py-3",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Chargement…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {empty ?? "Aucun résultat"}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-card-border last:border-0",
                    onRowClick && "cursor-pointer hover-elevate",
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  data-testid={`row-${row.id}`}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn("px-4 py-3 align-middle", c.className)}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
      <div>
        {from}–{to} sur {total}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="border border-input rounded-md px-3 py-1 hover-elevate disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          data-testid="button-prev-page"
        >
          Précédent
        </button>
        <div>
          Page {page} / {totalPages}
        </div>
        <button
          className="border border-input rounded-md px-3 py-1 hover-elevate disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          data-testid="button-next-page"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
