import { config } from "./config";
import { localeQuery } from "./locale";

/** Tiny fetch helper over the baas contract (CORS-open reads, site.md §2a). */
const v1 = (path: string) => `${config.endpoint}/v1/projects/${config.project}${path}`;

export type Post = {
  path: string;
  title: string;
  body: string;
  category?: string;
  state?: string;
  create_time: string;
};

export async function listPosts(): Promise<Post[]> {
  // create_time is server-owned, not declared → not orderable on a JIT
  // collection; newest-first is a client-side sort over the returned rows.
  const response = await fetch(v1(`/posts${localeQuery()}`));
  if (!response.ok) return []; // collection not declared yet → empty blog
  const body = (await response.json()) as { results: Post[] };
  return body.results
    .filter((post) => post.state !== "DRAFT")
    .sort((a, b) => (a.create_time < b.create_time ? 1 : -1));
}

export async function getPost(id: string): Promise<Post | null> {
  const response = await fetch(v1(`/posts/${id}${localeQuery()}`));
  return response.ok ? ((await response.json()) as Post) : null;
}
