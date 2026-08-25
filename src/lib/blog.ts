export interface BlogPost {
  title: string;
  url: string;
  excerpt: string;
  publishedAt: string;
  coverImage?: string;
}

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  const res = await fetch('/api/substack-feed');
  if (!res.ok) throw new Error('Falha ao buscar posts do blog');
  return (await res.json()) as BlogPost[];
}
