interface ScaleInputProps {
  value: number | null;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}

export function ScaleInput({ value, onChange, min = 1, max = 10 }: ScaleInputProps) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`
            w-9 h-9 rounded-full text-sm font-medium transition-all
            ${value === n
              ? 'bg-petrol-700 text-white shadow-md scale-110'
              : 'bg-beige-200 text-dark/60 hover:bg-petrol-100 hover:text-petrol-700'
            }
          `}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
