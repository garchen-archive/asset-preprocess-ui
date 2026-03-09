import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();

    // Handle both string and array values
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else {
        params.set(key, value);
      }
    });

    params.set('page', String(page));
    return `${basePath}?${params.toString()}`;
  };

  const pages: (number | string)[] = [];
  const maxVisible = 7;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);

    const startPage = Math.max(2, currentPage - 2);
    const endPage = Math.min(totalPages - 1, currentPage + 2);

    if (startPage > 2) {
      pages.push("...");
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages - 1) {
      pages.push("...");
    }

    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="outline" asChild disabled={currentPage <= 1}>
        <Link href={buildUrl(currentPage - 1)}>Previous</Link>
      </Button>

      <div className="flex gap-1">
        {pages.map((pageNum, index) => {
          if (pageNum === "...") {
            return (
              <span key={`ellipsis-${index}`} className="px-2 py-2 text-sm">
                ...
              </span>
            );
          }

          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={buildUrl(Number(pageNum))}>{pageNum}</Link>
            </Button>
          );
        })}
      </div>

      <Button variant="outline" asChild disabled={currentPage >= totalPages}>
        <Link href={buildUrl(currentPage + 1)}>Next</Link>
      </Button>
    </div>
  );
}
