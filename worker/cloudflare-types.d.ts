// Minimal local type aliases for TypeScript checks outside the Cloudflare runtime.
type Fetcher = {
  fetch(request: Request): Promise<Response>;
};

type D1Database = unknown;
