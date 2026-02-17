"use client";

import {ChevronLeft, ChevronRight} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type GalleryPaginationControlsProps = {
    totalItems: number;
    page: number;
    pageSize: 10 | 25 | 50;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: 10 | 25 | 50) => void;
    disabled?: boolean;
};

export function GalleryPaginationControls({
    totalItems,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    disabled = false,
}: GalleryPaginationControlsProps) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const clampedPage = Math.min(Math.max(page, 1), totalPages);
    const from = totalItems === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
    const to = Math.min(clampedPage * pageSize, totalItems);

    const canPrev = clampedPage > 1 && !disabled;
    const canNext = clampedPage < totalPages && !disabled;

    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground">
                    Mostrando {from}-{to} de {totalItems}
                </p>
                <span className="text-xs text-muted-foreground">Solicitud:</span>
                {PAGE_SIZE_OPTIONS.map((option) => (
                    <Badge
                        key={option}
                        asChild
                        variant={option === pageSize ? "default" : "outline"}
                        className={disabled ? "opacity-60" : ""}
                    >
                        <button
                            type="button"
                            onClick={() => onPageSizeChange(option)}
                            disabled={disabled || option === pageSize}
                            className="cursor-pointer"
                        >
                            {option}
                        </button>
                    </Badge>
                ))}
            </div>

            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPageChange(clampedPage - 1)}
                    disabled={!canPrev}
                >
                    <ChevronLeft className="h-4 w-4"/>
                    Anterior
                </Button>
                <p className="text-xs text-muted-foreground">
                    Página {clampedPage} de {totalPages}
                </p>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPageChange(clampedPage + 1)}
                    disabled={!canNext}
                >
                    Siguiente
                    <ChevronRight className="h-4 w-4"/>
                </Button>
            </div>
        </div>
    );
}
