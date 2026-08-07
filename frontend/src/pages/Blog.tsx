import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "hono-aep-ui";
import { listPosts, type Post } from "../api";

export function BlogPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  useEffect(() => {
    void listPosts().then(setPosts);
  }, []);

  if (posts === null) return <p className="text-muted-foreground">Loading…</p>;
  if (posts.length === 0) {
    return (
      <div className="space-y-2 pt-8 text-center text-muted-foreground">
        <p>No posts yet.</p>
        <p className="text-xs">
          Declare the blog collection and publish a post — see the README's two-minute setup.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const id = post.path.split("/").pop()!;
        return (
          <Card key={post.path}>
            <CardHeader>
              <CardTitle>
                <Link to={`/blog/${id}`} className="hover:underline">
                  {post.title}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
              {post.category ? <Badge variant="secondary">{post.category}</Badge> : null}
              <span>{new Date(post.create_time).toLocaleDateString()}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
