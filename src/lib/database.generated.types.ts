// Generated from Supabase project Portal4D (ojmaxsskczukdbxpaull) on 2026-09-17.
// Schema snapshot only: no runtime behavior lives in this file.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type TableDef<
  Row,
  RequiredInsert extends keyof Row = never,
  Relationships extends Relationship[] = [],
> = {
  Row: Row
  Insert: Partial<Row> & Pick<Row, RequiredInsert>
  Update: Partial<Row>
  Relationships: Relationships
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: TableDef<{
        attendee_email: string | null
        attendee_name: string | null
        cal_booking_uid: string
        client_id: string | null
        created_at: string
        end_time: string | null
        id: string
        raw_payload: Json | null
        start_time: string
        status: string
        title: string | null
        updated_at: string
        zoom_join_url: string | null
      }, "cal_booking_uid" | "start_time", [{
        foreignKeyName: "appointments_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      bfi_questions: TableDef<{
        id: string
        question_number: number
        question_text: string
      }, "question_number" | "question_text">
      bot_conversations: TableDef<{
        client_id: string | null
        content: string
        created_at: string | null
        id: string
        phone: string
        role: string | null
      }, "content" | "phone", [{
        foreignKeyName: "bot_conversations_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      bot_messages: TableDef<{
        client_id: string
        content: string
        created_at: string
        id: string
        role: string
      }, "client_id" | "content" | "role", [{
        foreignKeyName: "bot_messages_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      bot_risk_alerts: TableDef<{
        acknowledged_at: string | null
        category: string
        client_id: string
        created_at: string
        id: string
        safe_summary: string
      }, "category" | "client_id" | "safe_summary", [{
        foreignKeyName: "bot_risk_alerts_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      bot_subscriptions: TableDef<{
        client_id: string
        created_at: string
        current_period_end: string | null
        id: string
        status: string
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        updated_at: string
      }, "client_id" | "status", [{
        foreignKeyName: "bot_subscriptions_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: true
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_assessments: TableDef<{
        client_id: string
        created_at: string
        id: string
        lgpd_consent: boolean | null
        raw_answers: Json
        source: string
        status: string
        submitted_at: string
        tally_submission_id: string | null
        version: number
        wants_email_notification: boolean | null
        wants_whatsapp_notification: boolean | null
      }, "client_id" | "raw_answers" | "submitted_at", [{
        foreignKeyName: "client_assessments_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_bfi_assessments: TableDef<{
        client_id: string
        created_at: string
        id: string
        lgpd_consent: boolean | null
        raw_answers: Json
        source: string
        status: string
        submitted_at: string
        version: number
        wants_email_notification: boolean | null
        wants_whatsapp_notification: boolean | null
      }, "client_id", [{
        foreignKeyName: "client_bfi_assessments_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_bot_context: TableDef<{
        client_id: string
        generated_at: string
        id: string
        sessions_considered: number
        summary_text: string
      }, "client_id", [{
        foreignKeyName: "client_bot_context_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: true
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_ecr_assessments: TableDef<{
        client_id: string
        created_at: string
        id: string
        lgpd_consent: boolean | null
        raw_answers: Json
        source: string
        status: string
        submitted_at: string
        version: number
        wants_email_notification: boolean | null
        wants_whatsapp_notification: boolean | null
      }, "client_id", [{
        foreignKeyName: "client_ecr_assessments_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_ensra_assessments: TableDef<{
        client_id: string
        created_at: string
        id: string
        lgpd_consent: boolean | null
        raw_answers: Json
        source: string
        status: string
        submitted_at: string
        version: number
        wants_email_notification: boolean | null
        wants_whatsapp_notification: boolean | null
      }, "client_id", [{
        foreignKeyName: "client_ensra_assessments_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_etas_assessments: TableDef<{
        client_id: string
        created_at: string
        id: string
        lgpd_consent: boolean | null
        raw_answers: Json
        source: string
        status: string
        submitted_at: string
        version: number
        wants_email_notification: boolean | null
        wants_whatsapp_notification: boolean | null
      }, "client_id", [{
        foreignKeyName: "client_etas_assessments_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_goals: TableDef<{
        closed_at: string | null
        closing_notes: string | null
        confirmed_at: string | null
        created_at: string
        entry_count_at_creation: number
        goal_text: string
        id: string
        source: string
        user_id: string
      }, "goal_text" | "user_id", [{
        foreignKeyName: "client_goals_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_invites: TableDef<{
        client_id: string
        email: string
        id: string
        sent_at: string
      }, "client_id" | "email", [{
        foreignKeyName: "client_invites_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_marq_assessments: TableDef<{
        client_id: string
        created_at: string
        id: string
        lgpd_consent: boolean | null
        raw_answers: Json
        source: string
        status: string
        submitted_at: string
        version: number
        wants_email_notification: boolean | null
        wants_whatsapp_notification: boolean | null
      }, "client_id", [{
        foreignKeyName: "client_marq_assessments_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_published_reports: TableDef<{
        acknowledged_at: string | null
        assessment_id: string
        client_id: string
        content: Json
        first_viewed_at: string | null
        id: string
        last_viewed_at: string | null
        published_at: string
        updated_at: string
      }, "assessment_id" | "client_id" | "content", [{
        foreignKeyName: "client_published_reports_assessment_id_fkey"
        columns: ["assessment_id"]
        isOneToOne: true
        referencedRelation: "client_assessments"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "client_published_reports_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_rbs_assessments: TableDef<{
        client_id: string
        created_at: string
        id: string
        lgpd_consent: boolean | null
        raw_answers: Json
        source: string
        status: string
        submitted_at: string
        version: number
        wants_email_notification: boolean | null
        wants_whatsapp_notification: boolean | null
      }, "client_id", [{
        foreignKeyName: "client_rbs_assessments_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_schema_reports: TableDef<{
        assessment_id: string
        client_content: Json | null
        client_content_status: string
        client_id: string
        created_at: string
        generated_with: string | null
        id: string
        previous_client_content: Json | null
        previous_content: string | null
        status: string
        technical_content: string | null
        updated_at: string
      }, "assessment_id" | "client_id", [{
        foreignKeyName: "client_schema_reports_assessment_id_fkey"
        columns: ["assessment_id"]
        isOneToOne: true
        referencedRelation: "client_assessments"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "client_schema_reports_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_schema_scores: TableDef<{
        assessment_id: string
        classification: string
        created_at: string
        domain_id: string
        id: string
        percentual: number
        raw_score: number
      }, "assessment_id" | "classification" | "domain_id" | "percentual" | "raw_score", [{
        foreignKeyName: "client_schema_scores_assessment_id_fkey"
        columns: ["assessment_id"]
        isOneToOne: false
        referencedRelation: "client_assessments"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "client_schema_scores_domain_id_fkey"
        columns: ["domain_id"]
        isOneToOne: false
        referencedRelation: "schema_domains"
        referencedColumns: ["id"]
      }]>
      client_signup_feedback: TableDef<{
        client_id: string
        created_at: string
        feedback: string
      }, "client_id" | "feedback", [{
        foreignKeyName: "client_signup_feedback_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: true
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_smi_assessments: TableDef<{
        client_id: string
        created_at: string
        id: string
        lgpd_consent: boolean | null
        raw_answers: Json
        source: string
        status: string
        submitted_at: string | null
        version: number
        wants_email_notification: boolean | null
        wants_whatsapp_notification: boolean | null
      }, "client_id", [{
        foreignKeyName: "client_smi_assessments_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_smi_published_reports: TableDef<{
        acknowledged_at: string | null
        assessment_id: string
        client_id: string
        content: Json
        first_viewed_at: string | null
        id: string
        last_viewed_at: string | null
        published_at: string
        updated_at: string
      }, "assessment_id" | "client_id" | "content", [{
        foreignKeyName: "client_smi_published_reports_assessment_id_fkey"
        columns: ["assessment_id"]
        isOneToOne: true
        referencedRelation: "client_smi_assessments"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "client_smi_published_reports_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_smi_reports: TableDef<{
        assessment_id: string
        client_content: Json | null
        client_content_status: string
        client_id: string
        created_at: string
        generated_with: string | null
        id: string
        previous_client_content: Json | null
        previous_content: string | null
        status: string
        technical_content: string | null
        updated_at: string
      }, "assessment_id" | "client_id", [{
        foreignKeyName: "client_smi_reports_assessment_id_fkey"
        columns: ["assessment_id"]
        isOneToOne: true
        referencedRelation: "client_smi_assessments"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "client_smi_reports_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      client_smi_scores: TableDef<{
        assessment_id: string
        average_score: number
        classification: string | null
        created_at: string
        id: string
        mode_id: string
        raw_sum: number
      }, "assessment_id" | "average_score" | "mode_id" | "raw_sum", [{
        foreignKeyName: "client_smi_scores_assessment_id_fkey"
        columns: ["assessment_id"]
        isOneToOne: false
        referencedRelation: "client_smi_assessments"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "client_smi_scores_mode_id_fkey"
        columns: ["mode_id"]
        isOneToOne: false
        referencedRelation: "smi_modes"
        referencedColumns: ["id"]
      }]>
      client_tokens: TableDef<{
        client_id: string
        created_at: string | null
        expires_at: string
        id: string
        token: string
      }, "client_id" | "expires_at" | "token", [{
        foreignKeyName: "client_tokens_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      content_articles: TableDef<{
        author_id: string
        category: string
        content_html: string
        cover_image_alt: string | null
        cover_image_url: string | null
        created_at: string
        excerpt: string
        faq: Json | null
        id: string
        published_at: string | null
        seo_description: string | null
        seo_title: string | null
        slug: string
        status: string
        tags: string[]
        title: string
        updated_at: string
      }, "author_id" | "category" | "content_html" | "excerpt" | "slug" | "title", [{
        foreignKeyName: "content_articles_author_id_fkey"
        columns: ["author_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      day_notes: TableDef<{
        content: string | null
        created_at: string
        emotions: Json | null
        id: string
        noted_at: string
        user_id: string
      }, "user_id">
      diaries: TableDef<{
        available_from: string | null
        available_to: string | null
        created_at: string | null
        id: string
        is_active: boolean | null
        name: string
      }, "name">
      diary_entries: TableDef<{
        created_at: string | null
        date: string
        diary_id: string
        goal_id: string | null
        id: string
        user_id: string
      }, "date" | "diary_id" | "user_id", [{
        foreignKeyName: "diary_entries_diary_id_fkey"
        columns: ["diary_id"]
        isOneToOne: false
        referencedRelation: "diaries"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "diary_entries_goal_id_fkey"
        columns: ["goal_id"]
        isOneToOne: false
        referencedRelation: "client_goals"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "diary_entries_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      diary_questions: TableDef<{
        diary_id: string
        id: string
        options: Json | null
        order_num: number
        required: boolean
        text: string
        type: string
      }, "diary_id" | "order_num" | "text" | "type", [{
        foreignKeyName: "diary_questions_diary_id_fkey"
        columns: ["diary_id"]
        isOneToOne: false
        referencedRelation: "diaries"
        referencedColumns: ["id"]
      }]>
      ecr_questions: TableDef<{
        id: string
        question_number: number
        question_text: string
      }, "question_number" | "question_text">
      ensra_questions: TableDef<{
        id: string
        question_number: number
        question_text: string
      }, "question_number" | "question_text">
      entry_answers: TableDef<{
        answer_text: string | null
        answer_value: number | null
        entry_id: string
        id: string
        question_id: string
      }, "entry_id" | "question_id", [{
        foreignKeyName: "entry_answers_entry_id_fkey"
        columns: ["entry_id"]
        isOneToOne: false
        referencedRelation: "diary_entries"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "entry_answers_question_id_fkey"
        columns: ["question_id"]
        isOneToOne: false
        referencedRelation: "diary_questions"
        referencedColumns: ["id"]
      }]>
      etas_questions: TableDef<{
        id: string
        question_number: number
        question_text: string
      }, "question_number" | "question_text">
      financas_lancamentos: TableDef<{
        ano: number
        categoria: string
        criado_em: string | null
        data_lancamento: string
        descricao: string
        id: number
        mes: number
        pessoa: string
        tipo: string
        valor: number
      }, "ano" | "categoria" | "descricao" | "mes" | "pessoa" | "tipo" | "valor">
      financas_limites: TableDef<{
        categoria: string
        criado_em: string | null
        id: number
        valor_limite: number
      }, "categoria" | "valor_limite">
      financas_metas: TableDef<{
        criado_em: string | null
        id: number
        nome: string
        valor_guardado: number
        valor_meta: number
      }, "nome" | "valor_meta">
      financas_saldo: TableDef<{
        atualizado_em: string | null
        id: number
        pessoa: string
        saldo: number
      }, "pessoa">
      instrument_invites: TableDef<{
        client_id: string
        created_at: string
        expires_at: string
        id: string
        instrument: string
        token: string
      }, "client_id" | "instrument", [{
        foreignKeyName: "instrument_invites_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      leads: TableDef<{
        answers: Json | null
        consent_at: string
        created_at: string
        email: string
        id: string
        name: string | null
        source: string
        status: string
        whatsapp: string | null
      }, "email" | "source">
      marq_questions: TableDef<{
        id: string
        question_number: number
        question_text: string
      }, "question_number" | "question_text">
      profiles: TableDef<{
        active: boolean | null
        address: string | null
        created_at: string | null
        diary_id: string | null
        diary_reminder_next_at: string | null
        diary_reminder_preference: string | null
        email: string
        first_login_at: string | null
        id: string
        last_login_at: string | null
        manychat_subscriber_id: string | null
        name: string | null
        role: string
        whatsapp: string | null
        whatsapp_appointment_reminder_optin: boolean | null
        whatsapp_diary_reminder_optin: boolean | null
        whatsapp_general_info_optin: boolean | null
      }, "email" | "id", [{
        foreignKeyName: "profiles_diary_id_fkey"
        columns: ["diary_id"]
        isOneToOne: false
        referencedRelation: "diaries"
        referencedColumns: ["id"]
      }]>
      push_subscriptions: TableDef<{
        auth: string
        client_id: string
        created_at: string | null
        endpoint: string
        id: string
        p256dh: string
      }, "auth" | "client_id" | "endpoint" | "p256dh", [{
        foreignKeyName: "push_subscriptions_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      rbs_questions: TableDef<{
        id: string
        question_number: number
        question_text: string
      }, "question_number" | "question_text">
      report_observations: TableDef<{
        assessment_id: string | null
        author_role: string
        client_id: string
        created_at: string
        id: string
        message: string
        parent_id: string | null
        session_report_id: string | null
        status: string
        updated_at: string
      }, "author_role" | "client_id" | "message", [{
        foreignKeyName: "report_observations_assessment_id_fkey"
        columns: ["assessment_id"]
        isOneToOne: false
        referencedRelation: "client_assessments"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "report_observations_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "report_observations_parent_id_fkey"
        columns: ["parent_id"]
        isOneToOne: false
        referencedRelation: "report_observations"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "report_observations_session_report_id_fkey"
        columns: ["session_report_id"]
        isOneToOne: false
        referencedRelation: "session_reports"
        referencedColumns: ["id"]
      }]>
      reports: TableDef<{
        active: boolean | null
        content_text: string | null
        created_at: string | null
        first_viewed_at: string | null
        id: string
        last_viewed_at: string | null
        period_end: string
        period_start: string
        published: boolean | null
        user_id: string
      }, "period_end" | "period_start" | "user_id", [{
        foreignKeyName: "reports_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      roteiros: TableDef<{
        ai_review: Json | null
        ai_rewrite: Json | null
        cena: string
        checklist: boolean[]
        created_at: string
        crenca: string
        extracted_at: string | null
        fechamento: string
        id: string
        mecanismo: string
        reviewed_at: string | null
        source_text: string | null
        termo: string
        teste: string
        title: string
        updated_at: string
        user_id: string
      }, "user_id">
      scheduling_contacts: TableDef<{
        created_at: string
        id: string
        name: string
        phone: string
        therapist_id: string
      }, "name" | "phone" | "therapist_id", [{
        foreignKeyName: "scheduling_contacts_therapist_id_fkey"
        columns: ["therapist_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      schema_domains: TableDef<{
        code: string
        created_at: string
        friendly_name: string | null
        id: string
        name: string
        question_count: number
        wiki_description: string | null
      }, "code" | "name" | "question_count">
      schema_questions: TableDef<{
        created_at: string
        domain_id: string
        id: string
        question_number: number
        question_text: string
      }, "domain_id" | "question_number" | "question_text", [{
        foreignKeyName: "schema_questions_domain_id_fkey"
        columns: ["domain_id"]
        isOneToOne: false
        referencedRelation: "schema_domains"
        referencedColumns: ["id"]
      }]>
      schema_vulnerability_modes: TableDef<{
        created_at: string
        domain_id: string
        id: string
        is_hypothesis: boolean
        mode_name: string | null
        notes: string | null
      }, "domain_id", [{
        foreignKeyName: "schema_vulnerability_modes_domain_id_fkey"
        columns: ["domain_id"]
        isOneToOne: true
        referencedRelation: "schema_domains"
        referencedColumns: ["id"]
      }]>
      session_reports: TableDef<{
        client_id: string
        content_html: string
        created_at: string
        first_viewed_at: string | null
        id: string
        last_viewed_at: string | null
        notion_session_id: string | null
        notion_session_url: string | null
        published_at: string | null
        qa_notes: string | null
        reviewed_at: string | null
        session_date: string
        status: string
        title: string
        updated_at: string
      }, "client_id" | "session_date" | "title", [{
        foreignKeyName: "session_reports_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      smi_mode_schema_links: TableDef<{
        created_at: string
        id: string
        is_hypothesis: boolean
        notes: string | null
        schema_domain_id: string
        smi_mode_id: string
      }, "schema_domain_id" | "smi_mode_id", [{
        foreignKeyName: "smi_mode_schema_links_schema_domain_id_fkey"
        columns: ["schema_domain_id"]
        isOneToOne: false
        referencedRelation: "schema_domains"
        referencedColumns: ["id"]
      }, {
        foreignKeyName: "smi_mode_schema_links_smi_mode_id_fkey"
        columns: ["smi_mode_id"]
        isOneToOne: false
        referencedRelation: "smi_modes"
        referencedColumns: ["id"]
      }]>
      smi_modes: TableDef<{
        category: string
        code: string
        created_at: string
        description: string | null
        id: string
        name: string
        question_count: number
      }, "category" | "code" | "name" | "question_count">
      smi_questions: TableDef<{
        created_at: string
        id: string
        mode_id: string
        question_number: number
        question_text: string
      }, "mode_id" | "question_number" | "question_text", [{
        foreignKeyName: "smi_questions_mode_id_fkey"
        columns: ["mode_id"]
        isOneToOne: false
        referencedRelation: "smi_modes"
        referencedColumns: ["id"]
      }]>
      whatsapp_logs: TableDef<{
        client_id: string | null
        created_at: string | null
        direction: string
        id: string
        keyword: string | null
        message: string | null
        phone: string
      }, "direction" | "phone", [{
        foreignKeyName: "whatsapp_logs_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
      whatsapp_sessions: TableDef<{
        client_id: string | null
        created_at: string | null
        id: string
        invite_sent_at: string | null
        last_message_at: string | null
        last_reminder_at: string | null
        opted_in_at: string | null
        phone: string
        status: string
      }, "phone", [{
        foreignKeyName: "whatsapp_sessions_client_id_fkey"
        columns: ["client_id"]
        isOneToOne: true
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      }]>
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_account_role: { Args: { p_email: string }; Returns: string }
      check_client_signup_rate_limit: {
        Args: { p_email: string; p_ip: string; p_phone: string }
        Returns: boolean
      }
      delete_client: { Args: { client_id: string }; Returns: undefined }
      get_client_diary_data: {
        Args: { p_date?: string; p_token: string }
        Returns: Json
      }
      get_client_last_login: { Args: { p_client_id: string }; Returns: string }
      get_clients_last_login: {
        Args: never
        Returns: {
          client_id: string
          first_login: string
          last_login: string
        }[]
      }
      issue_assessment_edit_token: {
        Args: { p_assessment_id: string; p_instrument: string }
        Returns: string
      }
      record_client_login: { Args: never; Returns: undefined }
      record_monthly_report_view: { Args: { p_report_id: string }; Returns: undefined }
      record_report_acknowledgment: { Args: { p_assessment_id: string }; Returns: undefined }
      record_report_view: { Args: { p_assessment_id: string }; Returns: undefined }
      record_session_report_view: { Args: { p_session_report_id: string }; Returns: undefined }
      record_smi_report_acknowledgment: { Args: { p_assessment_id: string }; Returns: undefined }
      record_smi_report_view: { Args: { p_assessment_id: string }; Returns: undefined }
      submit_client_diary_entry: {
        Args: { p_answers: Json; p_date: string; p_diary_id: string; p_token: string }
        Returns: Json
      }
      submit_lead: {
        Args: {
          p_answers?: Json
          p_email: string
          p_name: string
          p_source: string
          p_status?: string
          p_whatsapp: string
        }
        Returns: undefined
      }
      update_client_profile: {
        Args: {
          p_address?: string
          p_client_id: string
          p_diary_id?: string
          p_email: string
          p_name: string
          p_whatsapp?: string
        }
        Returns: undefined
      }
      verify_assessment_edit_token: {
        Args: { p_assessment_id: string; p_instrument: string; p_token: string }
        Returns: boolean
      }
      verify_internal_edge_token: { Args: { p_token: string }; Returns: boolean }
      validate_client_token: {
        Args: { p_token: string }
        Returns: {
          active: boolean
          client_id: string
          email: string
          expires_at: string
          name: string
        }[]
      }
      validate_instrument_invite: {
        Args: { p_instrument: string; p_token: string }
        Returns: {
          client_id: string
          email: string
          expires_at: string
          name: string
          whatsapp: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
