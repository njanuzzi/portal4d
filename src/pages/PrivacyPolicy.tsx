export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-beige-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-semibold text-dark mb-2">
            Política de Privacidade
          </h1>
          <p className="text-sm text-dark/50">Última atualização: maio de 2026</p>
        </div>

        <div className="bg-white rounded-2xl border border-beige-200 p-8 space-y-8 text-dark/80 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold font-serif text-dark mb-3">1. Quem somos</h2>
            <p>
              O <strong>Portal D4 — Protocolo 4D</strong> é uma plataforma de acompanhamento terapêutico
              operada por <strong>Núbia Januzzi Santucci</strong>, psicóloga e terapeuta comportamental.
              Este sistema é utilizado exclusivamente para comunicação entre terapeuta e clientes no
              âmbito do protocolo de Desbloqueio Comportamental.
            </p>
            <p className="mt-2">Contato: <a href="mailto:nubiajanuzzicontato@gmail.com" className="text-petrol-700 hover:underline">nubiajanuzzicontato@gmail.com</a></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold font-serif text-dark mb-3">2. Dados coletados</h2>
            <p>Coletamos apenas os dados necessários para o funcionamento do protocolo:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Nome completo</li>
              <li>Endereço de e-mail</li>
              <li>Número de telefone (WhatsApp)</li>
              <li>Respostas ao diário terapêutico diário</li>
              <li>Histórico de acesso ao sistema</li>
              <li>Relatórios clínicos elaborados pela terapeuta</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold font-serif text-dark mb-3">3. Como usamos seus dados</h2>
            <p>Seus dados são utilizados exclusivamente para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Envio de lembretes diários pelo WhatsApp para preenchimento do diário terapêutico</li>
              <li>Registro e acompanhamento das suas respostas ao protocolo</li>
              <li>Elaboração de relatórios clínicos pela sua terapeuta</li>
              <li>Comunicação direta entre você e sua terapeuta</li>
            </ul>
            <p className="mt-2 text-sm">
              Seus dados <strong>não são compartilhados com terceiros</strong> nem utilizados para
              fins comerciais, publicidade ou análises externas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold font-serif text-dark mb-3">4. WhatsApp e Meta</h2>
            <p className="text-sm">
              Utilizamos a <strong>API do WhatsApp Business</strong> (fornecida pela Meta Platforms, Inc.)
              para enviar lembretes e mensagens automáticas. Ao aceitar participar do acompanhamento
              via WhatsApp, você concorda que seu número de telefone seja utilizado para esse fim.
              As mensagens são enviadas somente após seu consentimento expresso ("Entendi").
            </p>
            <p className="mt-2 text-sm">
              Você pode cancelar o recebimento a qualquer momento respondendo "Não entendi" ou
              entrando em contato diretamente com sua terapeuta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold font-serif text-dark mb-3">5. Armazenamento e segurança</h2>
            <p className="text-sm">
              Seus dados são armazenados de forma segura na plataforma <strong>Supabase</strong>
              (infraestrutura em nuvem com criptografia em trânsito e em repouso). O acesso é
              protegido por autenticação e controles de permissão por perfil.
            </p>
            <p className="mt-2 text-sm">
              Apenas a terapeuta responsável tem acesso aos seus dados. Nenhum outro usuário
              pode visualizar suas informações.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold font-serif text-dark mb-3">6. Seus direitos (LGPD)</h2>
            <p className="text-sm">
              Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Acessar seus dados pessoais</li>
              <li>Solicitar correção de dados incorretos</li>
              <li>Solicitar exclusão dos seus dados</li>
              <li>Revogar o consentimento para comunicações via WhatsApp</li>
            </ul>
            <p className="mt-2 text-sm">
              Para exercer qualquer desses direitos, entre em contato pelo e-mail:
              <a href="mailto:nubiajanuzzicontato@gmail.com" className="text-petrol-700 hover:underline ml-1">
                nubiajanuzzicontato@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold font-serif text-dark mb-3">7. Retenção de dados</h2>
            <p className="text-sm">
              Seus dados são mantidos durante o período ativo do protocolo terapêutico. Após o
              encerramento do acompanhamento, os dados podem ser mantidos por até 5 anos conforme
              exigências do Conselho Federal de Psicologia, sendo então excluídos permanentemente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold font-serif text-dark mb-3">8. Alterações nesta política</h2>
            <p className="text-sm">
              Esta política pode ser atualizada periodicamente. Alterações relevantes serão comunicadas
              diretamente pela terapeuta. O uso contínuo do sistema após as alterações implica
              aceitação da nova versão.
            </p>
          </section>

          <div className="pt-4 border-t border-beige-200 text-xs text-dark/40 text-center">
            Portal D4 — Protocolo 4D · Núbia Januzzi Santucci · {' '}
            <a href="mailto:nubiajanuzzicontato@gmail.com" className="hover:underline">
              nubiajanuzzicontato@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
