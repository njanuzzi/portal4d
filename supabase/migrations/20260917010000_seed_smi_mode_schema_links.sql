-- Preenche o "De/Para" entre os 16 esquemas do YSQ e os 14 modos do SMI —
-- arquitetura já prevista desde a criação do SMI (smi_mode_schema_links),
-- deixada vazia até agora. Mapeamento é hipótese clínica (is_hypothesis já
-- é o default da coluna), fundamentado na teoria de modos de Young: modos
-- são a ativação de um ou mais esquemas num dado momento. A "Criança
-- Vulnerável" concentra a maioria dos esquemas nucleares de vulnerabilidade
-- (abandono, privação, desconfiança, etc.) porque no modelo de modos ela é
-- o "hub" afetivo desses esquemas — não é um artefato do mapeamento, é
-- como a própria teoria organiza os 16 esquemas em cima de menos modos.
--
-- Onde já existia uma hipótese equivalente em schema_vulnerability_modes
-- (tabela do YSQ, com nomes de modo mais granulares que os 14 do SMI), usei
-- como ponto de partida e consolidei pro vocabulário do SMI.

insert into public.smi_mode_schema_links (smi_mode_id, schema_domain_id, notes) values
  ((select id from smi_modes where code = 'crianca_vulneravel'), (select id from schema_domains where code = 'ab'),
    'Medo de abandono é afeto nuclear da Criança Vulnerável (medo, tristeza, desamparo).'),
  ((select id from smi_modes where code = 'capitulador_complacente'), (select id from schema_domains where code = 'as'),
    'Auto-sacrifício expressa-se como submissão às necessidades alheias — mesma lógica do Capitulador Complacente.'),
  ((select id from smi_modes where code = 'crianca_impulsiva'), (select id from schema_domains where code = 'ai'),
    'Autocontrole/autodisciplina insuficientes cobre tanto a busca impulsiva por prazer quanto a falta de constância — o SMI separa isso em dois modos.'),
  ((select id from smi_modes where code = 'crianca_indisciplinada'), (select id from schema_domains where code = 'ai'),
    'Ver nota em Criança Impulsiva — mesmo esquema, faceta de desorganização/procrastinação.'),
  ((select id from smi_modes where code = 'crianca_vulneravel'), (select id from schema_domains where code = 'dv'),
    'Vergonha e sensação de ser fundamentalmente defeituoso são afeto nuclear da Criança Vulnerável.'),
  ((select id from smi_modes where code = 'pais_punitivos'), (select id from schema_domains where code = 'dv'),
    'A vergonha de Defectividade costuma ser mantida por uma voz interna crítica/depreciativa — o Pai/Mãe Punitivo.'),
  ((select id from smi_modes where code = 'crianca_vulneravel'), (select id from schema_domains where code = 'di'),
    'Sentir que não dá conta sozinho é tema de desamparo da Criança Vulnerável.'),
  ((select id from smi_modes where code = 'crianca_vulneravel'), (select id from schema_domains where code = 'da'),
    'Expectativa de ser magoado/traído ativa o afeto de medo da Criança Vulnerável.'),
  ((select id from smi_modes where code = 'crianca_vulneravel'), (select id from schema_domains where code = 'em'),
    'Dificuldade de se sentir separado dos outros está ligada à fusão/dependência da Criança Vulnerável.'),
  ((select id from smi_modes where code = 'crianca_vulneravel'), (select id from schema_domains where code = 'fr'),
    'Sentir-se inadequado/inferior em comparação aos outros é tema central da Criança Vulnerável.'),
  ((select id from smi_modes where code = 'pais_exigentes_criticos'), (select id from schema_domains where code = 'fr'),
    'A sensação de fracasso costuma ser reforçada por uma voz interna de exigência/comparação — Pais Exigentes/Críticos.'),
  ((select id from smi_modes where code = 'crianca_vulneravel'), (select id from schema_domains where code = 'is'),
    'Sentir-se socialmente indesejável ativa vergonha e medo de rejeição — Criança Vulnerável.'),
  ((select id from smi_modes where code = 'protetor_desligado'), (select id from schema_domains where code = 'ie'),
    'Inibição emocional é o próprio mecanismo do Protetor Desligado (conter emoções pra evitar vergonha ou perder controle).'),
  ((select id from smi_modes where code = 'crianca_vulneravel'), (select id from schema_domains where code = 'ia'),
    'Não pertencer a nenhum grupo ativa solidão e rejeição — Criança Vulnerável.'),
  ((select id from smi_modes where code = 'autoengrandecedor'), (select id from schema_domains where code = 'me'),
    'Merecimento/direito a tratamento especial é a base cognitiva do Autoengrandecedor — mapeamento clássico na literatura de modos.'),
  ((select id from smi_modes where code = 'pais_exigentes_criticos'), (select id from schema_domains where code = 'pi'),
    'Padrões inflexíveis (exigência rígida consigo mesmo) é o mapeamento clássico do Pai/Mãe Exigente/Crítico na literatura de modos.'),
  ((select id from smi_modes where code = 'crianca_vulneravel'), (select id from schema_domains where code = 'pe'),
    'Privação emocional (sentir que o cuidado nunca é suficiente) é esquema nuclear clássico da Criança Vulnerável.'),
  ((select id from smi_modes where code = 'capitulador_complacente'), (select id from schema_domains where code = 'sb'),
    'Subjugação é ceder às vontades alheias pra evitar conflito — comportamento central do Capitulador Complacente.'),
  ((select id from smi_modes where code = 'crianca_zangada'), (select id from schema_domains where code = 'sb'),
    'Sob a submissão da Subjugação costuma haver raiva bloqueada por medo de retaliação/abandono — Criança Zangada.'),
  ((select id from smi_modes where code = 'crianca_vulneravel'), (select id from schema_domains where code = 'vd'),
    'Medo de catástrofe (saúde, segurança) ativa o afeto de medo da Criança Vulnerável.');
