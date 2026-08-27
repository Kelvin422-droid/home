import { DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES, handleImageOptimization } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

const DATA_PATH = "/api/data";
const SAVE_PATH = "/api/save";
const DATA_CACHE_CONTROL = "public, max-age=30, s-maxage=300";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type CloudflareCacheStorage = CacheStorage & { readonly default: Cache };

function dataCacheKey(url: URL): Request {
  const cacheUrl = new URL(url.origin);
  cacheUrl.pathname = DATA_PATH;
  return new Request(cacheUrl.toString(), { method: "GET" });
}

function bypassesDataCache(request: Request): boolean {
  const directive = request.headers.get("cache-control")?.toLowerCase() ?? "";
  return directive.includes("no-cache") || directive.includes("no-store");
}

function withCacheStatus(response: Response, status: "HIT" | "MISS" | "BYPASS"): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", DATA_CACHE_CONTROL);
  headers.set("X-DawnNav-Cache", status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const edgeCache = (caches as CloudflareCacheStorage).default;

    if (url.pathname === "/_vinext/image") {
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        }
      }, [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES]);
    }

    if (request.method === "GET" && url.pathname === DATA_PATH) {
      const cacheKey = dataCacheKey(url);
      const bypassCache = bypassesDataCache(request);
      if (!bypassCache) {
        const cached = await edgeCache.match(cacheKey);
        if (cached) return withCacheStatus(cached, "HIT");
      }

      const response = await handler.fetch(request, env, context);
      if (!response.ok) return response;
      const cacheable = withCacheStatus(response, bypassCache ? "BYPASS" : "MISS");
      context.waitUntil(edgeCache.put(cacheKey, cacheable.clone()).catch((error) => console.error("Unable to cache directory data", error)));
      return cacheable;
    }

    if (request.method === "POST" && url.pathname === SAVE_PATH) {
      const response = await handler.fetch(request, env, context);
      if (response.ok) {
        context.waitUntil(edgeCache.delete(dataCacheKey(url)).catch((error) => {
          console.error("Unable to invalidate directory cache", error);
          return false;
        }));
      }
      return response;
    }

    return handler.fetch(request, env, context);
  }
};
