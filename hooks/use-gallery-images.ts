"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import type {GalleryImage} from "@/lib/images/gallery-image";

const GALLERY_CACHE_TTL_MS = 5 * 60 * 1000;

type GalleryCacheEntry = {
    images: GalleryImage[];
    fetchedAt: number;
    inFlight: Promise<GalleryImage[]> | null;
};

const galleryCacheByUser = new Map<string, GalleryCacheEntry>();

function getUserCacheEntry(userId: string): GalleryCacheEntry | null {
    return galleryCacheByUser.get(userId) || null;
}

function hasFreshCache(userId: string): boolean {
    const entry = getUserCacheEntry(userId);
    if (!entry) {
        return false;
    }
    return Date.now() - entry.fetchedAt < GALLERY_CACHE_TTL_MS;
}

function readCache(userId: string): GalleryImage[] | null {
    return getUserCacheEntry(userId)?.images || null;
}

function writeCache(userId: string, images: GalleryImage[]) {
    const previous = getUserCacheEntry(userId);
    galleryCacheByUser.set(userId, {
        images,
        fetchedAt: Date.now(),
        inFlight: previous?.inFlight || null,
    });
}

function writeInFlight(userId: string, inFlight: Promise<GalleryImage[]> | null) {
    const previous = getUserCacheEntry(userId);
    galleryCacheByUser.set(userId, {
        images: previous?.images || [],
        fetchedAt: previous?.fetchedAt || 0,
        inFlight,
    });
}

async function requestGalleryImages(force: boolean, userId: string): Promise<GalleryImage[]> {
    const cachedImages = readCache(userId);
    if (!force && hasFreshCache(userId) && cachedImages) {
        return cachedImages;
    }

    const activeRequest = getUserCacheEntry(userId)?.inFlight || null;
    if (activeRequest) {
        return activeRequest;
    }

    const request = (async () => {
        const response = await fetch("/api/images/gallery", {
            method: "GET",
            cache: "no-store",
        });

        if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(payload.error || "No se pudo cargar la galería.");
        }

        const payload = (await response.json()) as { images?: GalleryImage[] };
        const items = payload.images || [];
        writeCache(userId, items);
        return items;
    })();
    writeInFlight(userId, request);

    try {
        return await request;
    } finally {
        writeInFlight(userId, null);
    }
}

export function invalidateGalleryImagesCache(userId?: string | null) {
    if (userId) {
        galleryCacheByUser.delete(userId);
        return;
    }
    galleryCacheByUser.clear();
}

export function useGalleryImages(input: { userId: string | null; enabled?: boolean }) {
    const enabled = input.enabled ?? true;
    const [images, setImages] = useState<GalleryImage[]>(() => (input.userId ? readCache(input.userId) || [] : []));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canLoad = useMemo(() => enabled && !!input.userId, [enabled, input.userId]);

    const refresh = useCallback(
        async (options?: { force?: boolean; silent?: boolean }) => {
            const force = options?.force ?? false;
            const silent = options?.silent ?? false;

            if (!canLoad || !input.userId) {
                setImages([]);
                setError(null);
                return [] as GalleryImage[];
            }

            if (!force && hasFreshCache(input.userId)) {
                const cached = readCache(input.userId) || [];
                setImages(cached);
                return cached;
            }

            if (!silent) {
                setLoading(true);
            }
            setError(null);

            try {
                const next = await requestGalleryImages(force, input.userId);
                setImages(next);
                return next;
            } catch (reason) {
                const message = reason instanceof Error ? reason.message : "No se pudo cargar la galería.";
                setError(message);
                throw reason;
            } finally {
                if (!silent) {
                    setLoading(false);
                }
            }
        },
        [canLoad, input.userId],
    );

    useEffect(() => {
        if (!canLoad) {
            setImages([]);
            setLoading(false);
            setError(null);
            return;
        }

        if (!input.userId) {
            setImages([]);
            setLoading(false);
            setError(null);
            return;
        }

        const cached = readCache(input.userId);
        if (cached) {
            setImages(cached);
            if (hasFreshCache(input.userId)) {
                return;
            }
            void refresh({force: true, silent: true}).catch(() => {
                // El estado de error se maneja dentro del hook.
            });
            return;
        }

        void refresh({force: true}).catch(() => {
            // El estado de error se maneja dentro del hook.
        });
    }, [canLoad, input.userId, refresh]);

    return {
        images,
        loading,
        error,
        refresh,
    };
}
