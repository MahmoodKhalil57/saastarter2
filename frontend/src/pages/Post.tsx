import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getPost, type Post } from "../api";

export function PostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  useEffect(() => {
    void getPost(id!).then(setPost);
  }, [id]);

  if (post === undefined) return <p className="text-muted-foreground">Loading…</p>;
  if (post === null)
    return (
      <p className="text-muted-foreground">
        Not found. <Link to="/blog" className="underline">Back to the blog</Link>
      </p>
    );
  return (
    <article className="prose-sm space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
      <p className="text-sm text-muted-foreground">
        {new Date(post.create_time).toLocaleDateString()}
      </p>
      <div className="whitespace-pre-wrap leading-7">{post.body}</div>
    </article>
  );
}
