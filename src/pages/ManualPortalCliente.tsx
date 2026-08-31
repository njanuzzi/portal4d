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
} from 'lucide-react';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { SeoHead } from '../components/SeoHead';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';

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
      <Card className="max-w-none">
        <CardBody className="space-y-3 py-3">
          <p className="text-xs font-semibold text-dark">Anotação rápida</p>
          <Textarea readOnly value="Consegui parar antes de responder no automático hoje." rows={2} className="text-xs" />
          <p className="text-[10px] font-medium text-dark/50">Intensidade (1 = pouco • 10 = muito)</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-dark/70 w-16 shrink-0">🙂 Calma</span>
            <div className="flex gap-1 flex-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <div
                  key={n}
                  className={`flex-1 h-5 rounded text-[9px] flex items-center justify-center font-medium ${
                    n === 7 ? 'bg-petrol-500 text-white' : 'bg-beige-100 text-dark/40'
                  }`}
                >
                  {n}
                </div>
              ))}
            </div>
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

function MetasGalleryModal({ onClose }: { onClose: () => void }) {
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
        <h3 className="font-serif text-2xl text-dark mb-1">As telas de Metas</h3>
        <p className="text-dark/50 text-sm mb-8">Três momentos da mesma tela — tudo dentro do Diário.</p>
        <div className="grid sm:grid-cols-3 gap-8">
          {METAS_SCREENS.map((s) => (
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
        </Feature>

        <Feature
          icon={<Calendar size={20} className="text-white" />}
          eyebrow="Agendamento"
          title="Suas sessões"
          mock={<AgendamentoMock />}
          reverse
        >
          <p>Aqui você vê suas sessões marcadas.</p>
          <p>
            <strong className="text-dark">Importante:</strong> o link da sua sessão (Zoom) vai
            sempre por e-mail, não por aqui no WhatsApp — porque esse link já vem com senha, e eu
            não mando senha por WhatsApp. Fica de olho no seu e-mail perto do horário da sessão e
            usa sempre aquele link, não um antigo.
          </p>
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
                Tem também o botão de anotação, onde você pode registrar rapidinho o que está
                sentindo e a intensidade daquilo, mesmo fora do diário completo.
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
            <p className="text-dark/60 text-sm">
              Estamos em melhoria contínua — se encontrar qualquer problema no app, ou tiver alguma
              sugestão, me manda direto, sua opinião é muito bem-vinda.
            </p>
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

      {metasModalOpen && <MetasGalleryModal onClose={() => setMetasModalOpen(false)} />}
    </MarketingLayout>
  );
}
