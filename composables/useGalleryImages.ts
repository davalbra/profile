import type { GalleryImage } from "@/lib/images/gallery-image";

const GALLERY_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_GALLERY_SCOPE = "gallery";

export type GalleryScope = "gallery" | "n8n" | "optimized";

type GalleryCacheEntry = {
  images: GalleryImage[];
  fetchedAt: number;
  inFlight: Promise<GalleryImage[]> | null;
};

const galleryCacheByUser = new Map<string, GalleryCacheEntry>();

function buildCacheKey(userId: string, scope: GalleryScope): string {
  return `${scope}:${userId}`;
}

function getUserCacheEntry(userId: string, scope: GalleryScope): GalleryCacheEntry | null {
  return galleryCacheByUser.get(buildCacheKey(userId, scope)) || null;
}

function hasFreshCache(userId: string, scope: GalleryScope): boolean {
  const entry = getUserCacheEntry(userId, scope);
  return Boolean(entry && Date.now() - entry.fetchedAt < GALLERY_CACHE_TTL_MS);
}

function readCache(userId: string, scope: GalleryScope): GalleryImage[] | null {
  return getUserCacheEntry(userId, scope)?.images || null;
}

function writeCache(userId: string, scope: GalleryScope, images: GalleryImage[]) {
  const previous = getUserCacheEntry(userId, scope);
  galleryCacheByUser.set(buildCacheKey(userId, scope), {
    images,
    fetchedAt: Date.now(),
    inFlight: previous?.inFlight || null,
  });
}

function writeInFlight(userId: string, scope: GalleryScope, inFlight: Promise<GalleryImage[]> | null) {
  const previous = getUserCacheEntry(userId, scope);
  galleryCacheByUser.set(buildCacheKey(userId, scope), {
    images: previous?.images || [],
    fetchedAt: previous?.fetchedAt || 0,
    inFlight,
  });
}

async function requestGalleryImages(force: boolean, userId: string, scope: GalleryScope): Promise<GalleryImage[]> {
  const cachedImages = readCache(userId, scope);
  if (!force && hasFreshCache(userId, scope) && cachedImages) {
    return cachedImages;
  }

  const activeRequest = getUserCacheEntry(userId, scope)?.inFlight || null;
  if (activeRequest) {
    return activeRequest;
  }

  const request = (async () => {
    const endpoint =
      scope === "n8n"
        ? "/api/images/gallery?scope=n8n"
        : scope === "optimized"
          ? "/api/images/gallery?scope=optimized"
          : "/api/images/gallery";
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "No se pudo cargar la galería.");
    }

    const payload = (await response.json()) as { images?: GalleryImage[] };
    const items = payload.images || [];
    writeCache(userId, scope, items);
    return items;
  })();
  writeInFlight(userId, scope, request);

  try {
    return await request;
  } finally {
    writeInFlight(userId, scope, null);
  }
}

export function invalidateGalleryImagesCache(input?: { userId?: string | null; scope?: GalleryScope | null }) {
  const userId = input?.userId || null;
  const scope = input?.scope || null;

  if (userId && scope) {
    galleryCacheByUser.delete(buildCacheKey(userId, scope));
    return;
  }

  if (userId) {
    for (const key of galleryCacheByUser.keys()) {
      if (key.endsWith(`:${userId}`)) {
        galleryCacheByUser.delete(key);
      }
    }
    return;
  }

  galleryCacheByUser.clear();
}

export function useGalleryImages(input: {
  userId: MaybeRefOrGetter<string | null>;
  enabled?: MaybeRefOrGetter<boolean>;
  scope?: MaybeRefOrGetter<GalleryScope>;
}) {
  const images = ref<GalleryImage[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const currentScope = computed(() => toValue(input.scope) || DEFAULT_GALLERY_SCOPE);
  const canLoad = computed(() => (toValue(input.enabled) ?? true) && Boolean(toValue(input.userId)));

  const refresh = async (options?: { force?: boolean; silent?: boolean }) => {
    const userId = toValue(input.userId);
    const scope = currentScope.value;
    const force = options?.force ?? false;
    const silent = options?.silent ?? false;

    if (!canLoad.value || !userId) {
      images.value = [];
      error.value = null;
      return [] as GalleryImage[];
    }

    if (!force && hasFreshCache(userId, scope)) {
      const cached = readCache(userId, scope) || [];
      images.value = cached;
      return cached;
    }

    if (!silent) {
      loading.value = true;
    }
    error.value = null;

    try {
      const next = await requestGalleryImages(force, userId, scope);
      images.value = next;
      return next;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "No se pudo cargar la galería.";
      error.value = message;
      throw reason;
    } finally {
      if (!silent) {
        loading.value = false;
      }
    }
  };

  if (import.meta.client) {
    watch(
      [() => toValue(input.userId), currentScope, canLoad],
      ([userId, scope, enabled]) => {
        if (!enabled || !userId) {
          images.value = [];
          loading.value = false;
          error.value = null;
          return;
        }

        const cached = readCache(userId, scope);
        if (cached) {
          images.value = cached;
          if (hasFreshCache(userId, scope)) {
            return;
          }
          void refresh({ force: true, silent: true }).catch(() => {});
          return;
        }

        void refresh({ force: true }).catch(() => {});
      },
      { immediate: true },
    );
  }

  return {
    images,
    loading,
    error,
    refresh,
  };
}
