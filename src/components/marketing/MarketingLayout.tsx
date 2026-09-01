import { useState, type ReactNode } from 'react';
import { MarketingHeader } from './MarketingHeader';
import { MarketingDrawer } from './MarketingDrawer';
import { MarketingFooter } from './MarketingFooter';
import { WhatsAppFloatingButton } from './WhatsAppFloatingButton';

interface MarketingLayoutProps {
  children: ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="atlas-page min-h-screen bg-beige-100 text-dark font-sans">
      <MarketingHeader onOpenMenu={() => setMenuOpen(true)} />
      <MarketingDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      {children}
      <MarketingFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
