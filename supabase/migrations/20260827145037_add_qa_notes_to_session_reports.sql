ALTER TABLE session_reports ADD COLUMN qa_notes text;
COMMENT ON COLUMN session_reports.qa_notes IS 'Notas de qualidade/observações feitas durante a revisão de tom (inconsistências na fonte, nomes trocados, cortes, etc.) — histórico interno, não exibido ao cliente.';
