import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate, formatDateShort } from '../../lib/format';

// Paleta cicla entre tons de petrol e gold do design system — dá pra
// diferenciar até 6 perguntas tipo "scale" sem repetir cor.
const LINE_COLORS = ['#1B4B5A', '#C9A84C', '#77a5b8', '#9a7a28', '#3c7d9a', '#7c6118'];

export interface EvolutionPoint {
  date: string;
  [questionText: string]: string | number | null;
}

interface EvolutionChartProps {
  data: EvolutionPoint[];
  questions: string[];
}

export function EvolutionChart({ data, questions }: EvolutionChartProps) {
  if (questions.length === 0 || data.length === 0) {
    return (
      <p className="text-xs text-dark/40 text-center py-8">
        Preencha o diário com perguntas de escala (1-10) para ver sua evolução aqui.
      </p>
    );
  }

  return (
    <div className="h-64 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F4EDE0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            tick={{ fontSize: 11, fill: '#2C2C2C99' }}
            tickLine={false}
            axisLine={{ stroke: '#E8DCC8' }}
            minTickGap={24}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fontSize: 11, fill: '#2C2C2C99' }}
            tickLine={false}
            axisLine={false}
            width={24}
          />
          <Tooltip
            labelFormatter={(date) => formatDate(String(date))}
            contentStyle={{ borderRadius: 8, borderColor: '#E8DCC8', fontSize: 12 }}
          />
          {questions.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {questions.map((question, i) => (
            <Line
              key={question}
              type="monotone"
              dataKey={question}
              name={question}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
