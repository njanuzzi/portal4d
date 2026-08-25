import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BlogPost, fetchBlogPosts } from '../../lib/blog';

export function BlogPreview() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchBlogPosts()
      .then((data) => setPosts(data.slice(0, 3)))
      .catch(() => setFailed(true));
  }, []);

  if (failed || (posts && posts.length === 0)) return null;

  if (!posts) {
    return <p className="text-petrol-800/50 text-sm">Carregando posts...</p>;
  }

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {posts.map((post) => (
          <a
            key={post.url}
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-beige-300 rounded-xl p-4 hover:border-petrol-300 transition-colors"
          >
            <h3 className="font-serif text-lg mb-1 line-clamp-2">{post.title}</h3>
            <p className="text-petrol-800/70 text-sm line-clamp-3">{post.excerpt}</p>
          </a>
        ))}
      </div>
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 text-petrol-700 font-medium text-sm hover:text-petrol-800"
      >
        Ver todos os posts
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
