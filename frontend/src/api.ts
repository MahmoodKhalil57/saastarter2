import { config } from "./config";

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
  const response = await fetch(v1("/posts?order_by=create_time desc"));
  if (!response.ok) return []; // collection not declared yet → empty blog
  const body = (await response.json()) as { results: Post[] };
  return body.results.filter((post) => post.state !== "DRAFT");
}

export async function getPost(id: string): Promise<Post | null> {
  const response = await fetch(v1(`/posts/${id}`));
  return response.ok ? ((await response.json()) as Post) : null;
}
