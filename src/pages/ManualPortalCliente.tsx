/** Manual público do Portal 4D — link enviado por WhatsApp pra clientes já cadastrados, sem exigir login pra ler. */
import { ReactNode, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Bell,
  Target,
  KeyRound,
  Sparkles,
  Share,
  MoreVertical,
  Video,
  PenLine,
  MessageCircle,
  X,
  Images,
  FileText,
} from 'lucide-react';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { SeoHead } from '../components/SeoHead';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { buildWhatsAppLink } from '../lib/whatsapp';

// Mockups abaixo usam os MESMOS componentes de UI do portal (Card, Badge,
// Button, Textarea), só que com dado fictício — mostram exatamente como a
// tela real se parece, sem expor nenhum dado de cliente de verdade.

function PhoneFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-[320px] mx-auto ${className}`}>
      <div className="bg-dark rounded-[32px] p-2 shadow-xl">
        <div className="bg-beige-200 rounded-[24px] overflow-hidden">
          <div className="flex items-center justify-center py-1.5 bg-beige-200">
            <div className="w-16 h-1.5 rounded-full bg-dark/15" />
          </div>
          <div className="p-3 pt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

function HomeMock() {
  return (
    <PhoneFrame>
      <Card className="mb-3">
        <CardBody className="flex items-center gap-3 py-3">
          <div className="w-9 h-9 rounded-full bg-petrol-100 flex items-center justify-center shrink-0">
            <BookOpen size={16} className="text-petrol-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-dark">Diário de hoje pendente</div>
            <div className="text-[10px] text-dark/40">Leva só alguns minutos</div>
          </div>
          <Button size="sm" className="text-[11px] px-2.5 py-1">Preencher</Button>
        </CardBody>
      </Card>
      <div className="flex items-start gap-2.5 bg-gold-50 border border-gold-200 rounded-xl px-3 py-2.5">
        <Target size={15} className="text-gold-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-gold-700">Meta desta semana</p>
          <p className="text-[11px] text-dark/70 leading-snug">Anotar 1 vitória pequena por dia, mesmo que pareça bobinha</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {[{ n: 5, l: 'dias seguidos' }, { n: 18, l: 'registros' }, { n: 3, l: 'relatórios' }].map((s) => (
          <div key={s.l} className="bg-white rounded-lg border border-beige-300 text-center py-2.5">
            <div className="text-base font-semibold text-dark">{s.n}</div>
            <div className="text-[9px] text-dark/40 leading-tight mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>
    </PhoneFrame>
  );
}

const CALENDAR_WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
// Réplica leve do calendário público do Cal.com (cal.com/nubia-januzzi-orbex7/sessao-de-mentoria) —
// mesmo layout (mês + grade de dias + horários do dia selecionado), com as cores do portal.
function CalendarMock() {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const leadingBlanks = 2; // 1º de setembro/2026 cai numa terça
  return (
    <PhoneFrame>
      <Card className="max-w-none">
        <CardBody className="py-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-dark">Sessão de Mentoria</p>
            <p className="text-[10px] text-dark/40 flex items-center gap-1 mt-0.5">
              <Video size={10} /> Zoom Video · América/São Paulo
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-dark">Setembro 2026</span>
            <div className="flex gap-1 text-dark/30">
              <span className="text-xs">‹</span>
              <span className="text-xs">›</span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {CALENDAR_WEEKDAYS.map((d, i) => (
              <span key={`${d}-${i}`} className="text-[9px] text-dark/30 font-medium">{d}</span>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {days.map((day) => (
              <span
                key={day}
                className={`text-[10px] rounded-full w-5 h-5 mx-auto flex items-center justify-center ${
                  day === 14
                    ? 'bg-petrol-700 text-white font-semibold'
                    : day < 3
                      ? 'text-dark/20'
                      : 'text-dark/60'
                }`}
              >
                {day}
              </span>
            ))}
          </div>
          <div className="border-t border-beige-300 pt-2.5">
            <p className="text-[10px] font-medium text-dark/50 mb-1.5">Segunda-feira, 14</p>
            <div className="flex gap-2">
              {['19:00', '20:00'].map((t) => (
                <span key={t} className="flex-1 text-center text-[11px] py-1.5 rounded-lg border border-petrol-300 text-petrol-700 font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </PhoneFrame>
  );
}

function AgendamentoMock() {
  return (
    <PhoneFrame>
      <p className="text-[10px] font-semibold text-dark/50 uppercase tracking-wide mb-2">Próximos</p>
      <Card>
        <CardBody className="py-3">
          <Badge variant="success">Confirmado</Badge>
          <div className="text-xs font-medium text-dark mt-1.5 capitalize">Segunda-feira, 14 de setembro, 19:00</div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-petrol-600 underline underline-offset-2">Cancelar ou reagendar</span>
            <Button size="sm" className="text-[11px] px-2.5 py-1">
              <Video size={11} /> Entrar
            </Button>
          </div>
        </CardBody>
      </Card>
      <p className="text-[10px] font-semibold text-dark/50 uppercase tracking-wide mt-4 mb-2">Histórico</p>
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-beige-300">
        <span className="text-[11px] font-medium text-dark">Agosto de 2026</span>
        <span className="text-[10px] text-dark/40">4</span>
      </div>
    </PhoneFrame>
  );
}

function RelatoriosMock() {
  return (
    <PhoneFrame>
      <div className="flex gap-3 border-b border-beige-300 mb-3 text-[10px] font-medium">
        <span className="text-petrol-700 border-b-2 border-petrol-700 pb-1.5">Sessões (3)</span>
        <span className="text-dark/40 pb-1.5">Fechamento do Ciclo (1)</span>
        <span className="text-dark/40 pb-1.5">Esquemas (1)</span>
      </div>
      <Card>
        <CardBody className="py-3">
          <Badge variant="gold">Relatório de sessão</Badge>
          <div className="text-xs font-medium text-dark mt-1.5">14 de setembro de 2026</div>
          <div className="text-[10px] text-dark/40 mt-0.5">Disponível desde 15 de setembro</div>
          <p className="text-[11px] text-dark/60 mt-2 leading-snug line-clamp-2">
            Trabalhamos a dificuldade em pedir ajuda antes de chegar no limite...
          </p>
          <div className="flex justify-end mt-1.5">
            <Button size="sm" variant="ghost" className="text-[11px] px-2.5 py-1">Ler</Button>
          </div>
        </CardBody>
      </Card>
    </PhoneFrame>
  );
}

function LembretesMock() {
  return (
    <PhoneFrame>
      <Card className="max-w-none">
        <CardBody className="space-y-3 py-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Bell size={14} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-dark">Avisos ativados</p>
              <p className="text-[10px] text-dark/50 mt-0.5">Você recebe notificação e e-mail quando não preencher o diário do dia.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 justify-center pt-1">
            Tudo certo, você será avisado(a)
          </div>
        </CardBody>
      </Card>
    </PhoneFrame>
  );
}

function DefinirMetaMock() {
  return (
    <PhoneFrame>
      <Card className="border-2 border-gold-300 max-w-none">
        <CardBody className="space-y-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center shrink-0">
              <Target size={16} className="text-gold-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-dark">Qual é a sua meta desta semana?</p>
              <p className="text-[10px] text-dark/50 mt-0.5">Defina uma intenção que guiará suas reflexões nos próximos 7 registros.</p>
            </div>
          </div>
          <Textarea
            readOnly
            value="Quero praticar parar e respirar antes de reagir às situações difíceis."
            rows={3}
            className="text-xs"
          />
          <Button size="sm" className="w-full text-xs">Definir minha meta</Button>
        </CardBody>
      </Card>
    </PhoneFrame>
  );
}

function MetaAtualMock() {
  return (
    <PhoneFrame>
      <div className="flex items-start gap-2.5 bg-gold-50 border border-gold-200 rounded-xl p-3">
        <Target size={14} className="text-gold-600 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-gold-700 mb-0.5">Meta desta semana</p>
          <p className="text-xs text-dark/70 leading-snug">Anotar 1 vitória pequena por dia, mesmo que pareça bobinha</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] text-gold-700 underline underline-offset-2">Mudar meta</span>
            <span className="text-[10px] text-dark/40 underline underline-offset-2">Excluir meta</span>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function AnotacaoMock() {
  return (
    <PhoneFrame>
      <div className="flex gap-1 bg-beige-100 rounded-xl p-1 mb-3">
        <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium bg-white text-dark shadow-sm">
          <PenLine size={12} /> Anotações
        </div>
        <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium text-dark/40">
          <BookOpen size={12} /> Diário
        </div>
      </div>
      <Card className="max-w-none">
        <CardBody className="space-y-3 py-3">
          <Textarea readOnly value="O que está acontecendo agora?" rows={2} className="text-xs text-dark/30" />
          <p className="text-[10px] font-medium text-dark/50">Como você está se sentindo?</p>
          <div className="flex flex-wrap gap-1.5">
            {['😊 Alegria', '😰 Ansiedade', '😌 Calma'].map((e) => (
              <span key={e} className="text-[10px] px-2 py-1 rounded-lg border border-beige-300 text-dark/60">{e}</span>
            ))}
          </div>
          <Button size="sm" className="w-full text-xs">Salvar anotação</Button>
        </CardBody>
      </Card>
    </PhoneFrame>
  );
}

function ChatMock() {
  return (
    <PhoneFrame>
      <div className="space-y-2.5 py-1">
        <div className="flex justify-end">
          <div className="bg-petrol-700 text-white text-xs rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%]">
            hoje foi bem difícil, não consegui parar de pensar no trabalho
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white border border-beige-300 text-dark/80 text-xs rounded-2xl rounded-bl-sm px-3 py-2 max-w-[85%]">
            entendo. antes de mais nada: você consegue nomear o que estava sentindo nesse momento — ansiedade, cansaço, outra coisa?
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-petrol-700 text-white text-xs rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%]">
            acho que ansiedade mesmo
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white border border-beige-300 text-dark/80 text-xs rounded-2xl rounded-bl-sm px-3 py-2 max-w-[85%]">
            faz sentido com o que você tem trabalhado ultimamente. quer que eu te sugira uma meta pequena pra essa semana?
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

interface FeatureProps {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  children: ReactNode;
  mock?: ReactNode;
  reverse?: boolean;
}

function Feature({ icon, eyebrow, title, children, mock, reverse }: FeatureProps) {
  return (
    <div className={`grid gap-10 items-center py-12 border-t border-beige-300 ${mock ? 'lg:grid-cols-2' : ''}`}>
      <div className={reverse && mock ? 'lg:order-2' : ''}>
        <div className="w-11 h-11 rounded-xl bg-petrol-700 flex items-center justify-center mb-4">
          {icon}
        </div>
        <span className="text-gold-700 text-xs font-semibold tracking-wide uppercase">{eyebrow}</span>
        <h3 className="font-serif text-2xl text-dark mt-2 mb-3">{title}</h3>
        <div className="text-dark/60 text-sm leading-relaxed space-y-3">{children}</div>
      </div>
      {mock && <div className={reverse ? 'lg:order-1' : ''}>{mock}</div>}
    </div>
  );
}

const METAS_SCREENS = [
  { title: 'Você define a meta', mock: <DefinirMetaMock /> },
  { title: 'Acompanha e ajusta quando quiser', mock: <MetaAtualMock /> },
  { title: 'Registra uma anotação rápida a qualquer momento', mock: <AnotacaoMock /> },
];

const AGENDAMENTO_SCREENS = [
  { title: 'Você escolhe o dia e o horário', mock: <CalendarMock /> },
  { title: 'Sessão confirmada, com o "Entrar" liberado na hora', mock: <AgendamentoMock /> },
];

interface ScreensGalleryModalProps {
  title: string;
  subtitle: string;
  screens: { title: string; mock: ReactNode }[];
  onClose: () => void;
}

function ScreensGalleryModal({ title, subtitle, screens, onClose }: ScreensGalleryModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-dark/70 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="bg-beige-100 rounded-2xl max-w-4xl w-full p-6 sm:p-10 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white border border-beige-300 flex items-center justify-center text-dark/50 hover:text-dark"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
        <h3 className="font-serif text-2xl text-dark mb-1">{title}</h3>
        <p className="text-dark/50 text-sm mb-8">{subtitle}</p>
        <div className={`grid gap-8 ${screens.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {screens.map((s) => (
            <div key={s.title}>
              {s.mock}
              <p className="text-center text-xs text-dark/50 mt-3">{s.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ManualPortalCliente() {
  const [metasModalOpen, setMetasModalOpen] = useState(false);
  const [agendamentoModalOpen, setAgendamentoModalOpen] = useState(false);

  return (
    <MarketingLayout>
      <SeoHead
        title="Manual do Portal 4D"
        description="Como usar o Portal 4D: diário, agendamento, metas, lembretes e como instalar como aplicativo no celular."
        canonicalPath="/manualportalcliente"
      />

      <section className="atlas-content-hero">
        <div className="atlas-frame">
          <span className="atlas-eyebrow text-gold-200">PORTAL 4D</span>
          <h1>Seu manual do Portal 4D</h1>
          <p>
            Esse é o seu espaço de acompanhamento entre as sessões — diário, agendamento, metas e
            resumos, tudo num só lugar. Estou atualizando o portal aos poucos pra cada cliente,
            então algumas telas e funções podem ir aparecendo pra você com o tempo.
          </p>
        </div>
      </section>

      <section className="atlas-frame py-14">
        <div className="bg-petrol-700 text-white rounded-2xl p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-gold-300 text-xs font-semibold tracking-wide uppercase mb-2">Como entrar</p>
            <h2 className="font-serif text-2xl mb-2">nubiajanuzzi.com → Área de Membros</h2>
            <p className="text-petrol-100 text-sm max-w-md">
              Entre com o e-mail e a senha que você já cadastrou — o mesmo login do link que você
              recebeu pra criar sua conta.
            </p>
          </div>
          <a href="https://www.nubiajanuzzi.com/areamembros" className="shrink-0">
            <Button size="lg">
              Acessar Área de Membros <ArrowRight size={16} />
            </Button>
          </a>
        </div>

        <Feature
          icon={<BookOpen size={20} className="text-white" />}
          eyebrow="Diário"
          title="Seu registro diário"
          mock={<HomeMock />}
        >
          <p>O diário abre todos os dias às 18h e fica disponível até a meia-noite. É o momento de registrar como você está se sentindo naquele dia — leva só alguns minutos.</p>
          <p>
            <strong className="text-dark">Importante:</strong> as respostas do diário são sempre
            em referência à sua meta da semana — é isso que conecta o registro diário ao que a
            gente está trabalhando juntas.
          </p>
          <p>No Histórico, você revê os dias anteriores — o diário e as anotações daquele dia, juntos.</p>
        </Feature>

        <div className="grid gap-10 items-center py-12 border-t border-beige-300 lg:grid-cols-2">
          <div className="lg:order-2">
            <div className="w-11 h-11 rounded-xl bg-petrol-700 flex items-center justify-center mb-4">
              <Calendar size={20} className="text-white" />
            </div>
            <span className="text-gold-700 text-xs font-semibold tracking-wide uppercase">Agendamento</span>
            <h3 className="font-serif text-2xl text-dark mt-2 mb-3">Suas sessões</h3>
            <div className="text-dark/60 text-sm leading-relaxed space-y-3">
              <p>Aqui você marca sua sessão e vê as próximas já confirmadas.</p>
              <p>
                <strong className="text-dark">Importante:</strong> o link da sua sessão (Zoom) vai
                sempre por e-mail, não por aqui no WhatsApp — porque esse link já vem com senha, e
                eu não mando senha por WhatsApp. Fica de olho no seu e-mail perto do horário da
                sessão e usa sempre aquele link, não um antigo.
              </p>
              <button
                onClick={() => setAgendamentoModalOpen(true)}
                className="inline-flex items-center gap-2 text-petrol-700 font-medium text-sm underline underline-offset-2 hover:text-petrol-900"
              >
                <Images size={16} /> Ver mais telas do Agendamento
              </button>
            </div>
          </div>
          <div className="lg:order-1">
            <CalendarMock />
          </div>
        </div>

        <Feature
          icon={<FileText size={20} className="text-white" />}
          eyebrow="Sessões e Relatórios"
          title="O que fica registrado pra você"
          mock={<RelatoriosMock />}
        >
          <p>Depois de cada sessão, você encontra aqui um resumo curto do que foi trabalhado — vale a pena reler antes da próxima.</p>
          <p>De tempos em tempos você também recebe um <strong className="text-dark">Fechamento do Ciclo</strong>, com uma visão mais ampla do seu progresso ao longo do período.</p>
          <p>Se você já respondeu o inventário de esquemas, sua devolutiva de padrões também aparece aqui, na aba "Esquemas".</p>
        </Feature>

        <div className="grid gap-10 items-center py-12 border-t border-beige-300 lg:grid-cols-2">
          <div>
            <div className="w-11 h-11 rounded-xl bg-petrol-700 flex items-center justify-center mb-4">
              <Target size={20} className="text-white" />
            </div>
            <span className="text-gold-700 text-xs font-semibold tracking-wide uppercase">Metas</span>
            <h3 className="font-serif text-2xl text-dark mt-2 mb-3">A parte mais importante do portal</h3>
            <div className="text-dark/60 text-sm leading-relaxed space-y-3">
              <p>
                As metas conectam o que a gente trabalha na sessão com o seu dia a dia — pequenos
                passos entre um encontro e outro que ajudam a sustentar o que você está construindo
                em terapia.
              </p>
              <p>
                Ao final de 30 dias, vamos conseguir ver o seu progresso de verdade — mas isso só é
                possível se você preencher o diário por 30 dias corridos. Se pular dias, a gente
                perde a continuidade e não dá pra enxergar a evolução direito.
              </p>
              <p className="flex items-start gap-2">
                <PenLine size={15} className="text-gold-600 shrink-0 mt-0.5" />
                Tem também a aba de Anotações — diferente do diário (que só abre às 18h), ela fica
                aberta o dia inteiro, pra você registrar qualquer coisa que aconteça antes disso,
                na hora que acontecer.
              </p>
              <button
                onClick={() => setMetasModalOpen(true)}
                className="inline-flex items-center gap-2 text-petrol-700 font-medium text-sm underline underline-offset-2 hover:text-petrol-900"
              >
                <Images size={16} /> Ver as telas de Metas
              </button>
            </div>
          </div>
          <div>
            <DefinirMetaMock />
          </div>
        </div>

        <Feature
          icon={<Bell size={20} className="text-white" />}
          eyebrow="Lembretes"
          title="Pra não esquecer o diário"
          mock={<LembretesMock />}
          reverse
        >
          <p>No ícone de sino no topo do portal, você configura lembretes pra não esquecer de preencher o diário.</p>
        </Feature>

        <Feature
          icon={<KeyRound size={20} className="text-white" />}
          eyebrow="Alterar senha"
          title="Sua conta, seu controle"
        >
          <p>Também dá pra trocar sua senha a qualquer momento, direto no portal — sem precisar falar comigo.</p>
        </Feature>

        <Feature
          icon={<MessageCircle size={20} className="text-white" />}
          eyebrow="Bônus"
          title="Assistente do Portal 4D"
          mock={<ChatMock />}
          reverse
        >
          <p>
            O portal também tem um assistente disponível por assinatura — pra quem quiser um apoio
            extra entre as sessões, disponível a qualquer hora.
          </p>
        </Feature>

        <div className="border-t border-beige-300 pt-12">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles size={20} className="text-gold-600" />
            <h3 className="font-serif text-2xl text-dark">Como colocar o Portal 4D como app no celular</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <Card>
              <CardBody>
                <p className="text-sm font-semibold text-dark mb-3">No iPhone</p>
                <ol className="space-y-2.5 text-sm text-dark/60">
                  <li className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-beige-200 text-dark/50 text-xs flex items-center justify-center shrink-0">1</span>
                    Abra o portal pelo Safari
                  </li>
                  <li className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-beige-200 text-dark/50 text-xs flex items-center justify-center shrink-0">2</span>
                    Toque no ícone de compartilhar <Share size={14} className="inline mx-0.5" /> na barra inferior
                  </li>
                  <li className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-beige-200 text-dark/50 text-xs flex items-center justify-center shrink-0">3</span>
                    Escolha "Adicionar à Tela de Início"
                  </li>
                </ol>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-sm font-semibold text-dark mb-3">No Android</p>
                <ol className="space-y-2.5 text-sm text-dark/60">
                  <li className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-beige-200 text-dark/50 text-xs flex items-center justify-center shrink-0">1</span>
                    Abra o portal pelo Chrome
                  </li>
                  <li className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-beige-200 text-dark/50 text-xs flex items-center justify-center shrink-0">2</span>
                    Toque nos três pontinhos <MoreVertical size={14} className="inline mx-0.5" /> no canto superior direito
                  </li>
                  <li className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-beige-200 text-dark/50 text-xs flex items-center justify-center shrink-0">3</span>
                    Escolha "Adicionar à tela inicial" (ou "Instalar app")
                  </li>
                </ol>
              </CardBody>
            </Card>
          </div>
          <p className="text-dark/50 text-sm mt-6">
            Assim o Portal 4D fica com um ícone no seu celular, como se fosse um app de verdade.
          </p>
        </div>

        <div className="border-t border-beige-300 mt-12 pt-12 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <img
            src="/nubia-foto.jpg"
            alt="Núbia Januzzi"
            className="w-16 h-16 rounded-full object-cover border-2 border-gold-300 shrink-0"
          />
          <div className="flex-1">
            <h3 className="font-serif text-xl text-dark mb-1">Alguma dúvida ou problema?</h3>
            <p className="text-dark/60 text-sm mb-4">
              Estamos em melhoria contínua — se encontrar qualquer problema no app, ou tiver alguma
              sugestão, me manda direto, sua opinião é muito bem-vinda.
            </p>
            <a
              href={buildWhatsAppLink('Olá! Tenho uma dúvida sobre o Portal 4D.')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="sm">
                <MessageCircle size={16} />
                Fale com a gente
              </Button>
            </a>
          </div>
        </div>

        <div className="text-center mt-12">
          <a href="https://www.nubiajanuzzi.com/areamembros">
            <Button size="lg">
              Acessar Área de Membros <ArrowRight size={16} />
            </Button>
          </a>
        </div>
      </section>

      {metasModalOpen && (
        <ScreensGalleryModal
          title="As telas de Metas"
          subtitle="Três momentos da mesma tela — tudo dentro do Diário."
          screens={METAS_SCREENS}
          onClose={() => setMetasModalOpen(false)}
        />
      )}
      {agendamentoModalOpen && (
        <ScreensGalleryModal
          title="As telas de Agendamento"
          subtitle="Do calendário até a sessão confirmada."
          screens={AGENDAMENTO_SCREENS}
          onClose={() => setAgendamentoModalOpen(false)}
        />
      )}
    </MarketingLayout>
  );
}
