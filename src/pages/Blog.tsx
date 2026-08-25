import { useEffect, useState } from 'react';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { BlogPost, fetchBlogPosts } from '../lib/blog';

export function Blog() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchBlogPosts()
      .then(setPosts)
      .catch(() => setFailed(true));
  }, []);

  return (
    <MarketingLayout>
      <section className="bg-petrol-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <p className="text-gold-300 text-xs font-semibold tracking-widest uppercase mb-4">Conteúdo</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-balance">Blog</h1>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        {failed && (
          <p className="text-petrol-800/70">
            Não foi possível carregar os posts agora. Tente novamente em instantes.
          </p>
        )}
        {!failed && !posts && <p className="text-petrol-800/50 text-sm">Carregando posts...</p>}
        {!failed && posts && posts.length === 0 && (
          <p className="text-petrol-800/70">Em breve, novos textos por aqui.</p>
        )}
        {!failed && posts && posts.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-6">
            {posts.map((post) => (
              <a
                key={post.url}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-beige-300 rounded-xl p-6 hover:border-petrol-300 transition-colors"
              >
                <h2 className="font-serif text-xl mb-2">{post.title}</h2>
                <p className="text-petrol-800/70 text-sm leading-relaxed mb-3">{post.excerpt}</p>
                <span className="text-petrol-400 text-xs">
                  {new Date(post.publishedAt).toLocaleDateString('pt-BR')}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
    </MarketingLayout>
  );
}
