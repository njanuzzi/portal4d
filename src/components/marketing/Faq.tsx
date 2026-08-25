import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqProps {
  items: FaqItem[];
}

export function Faq({ items }: FaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-beige-300 border-y border-beige-300">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="w-full flex items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-serif text-lg text-petrol-900">{item.question}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-petrol-400 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
            {open && (
              <p className="text-petrol-800/80 leading-relaxed pb-5 pr-8">{item.answer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
