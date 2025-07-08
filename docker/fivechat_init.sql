--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: api_style; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.api_style AS ENUM (
    'openai',
    'openai_response',
    'claude',
    'gemini'
);


ALTER TYPE public.api_style OWNER TO postgres;

--
-- Name: avatar_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.avatar_type AS ENUM (
    'emoji',
    'url',
    'none'
);


ALTER TYPE public.avatar_type OWNER TO postgres;

--
-- Name: group_model_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.group_model_type AS ENUM (
    'default',
    'custom'
);


ALTER TYPE public.group_model_type OWNER TO postgres;

--
-- Name: history_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.history_type AS ENUM (
    'count',
    'token'
);


ALTER TYPE public.history_type OWNER TO postgres;

--
-- Name: llm_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.llm_type AS ENUM (
    'default',
    'custom'
);


ALTER TYPE public.llm_type OWNER TO postgres;

--
-- Name: mcp_server_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mcp_server_type AS ENUM (
    'stdio',
    'sse'
);


ALTER TYPE public.mcp_server_type OWNER TO postgres;

--
-- Name: model_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.model_type AS ENUM (
    'default',
    'custom'
);


ALTER TYPE public.model_type OWNER TO postgres;

--
-- Name: search_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.search_status AS ENUM (
    'none',
    'searching',
    'completed',
    'failed'
);


ALTER TYPE public.search_status OWNER TO postgres;

--
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.account OWNER TO postgres;

--
-- Name: authenticator; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.authenticator (
    "credentialID" text NOT NULL,
    "userId" text NOT NULL,
    "providerAccountId" text NOT NULL,
    "credentialPublicKey" bytea NOT NULL,
    counter integer NOT NULL,
    "credentialDeviceType" text NOT NULL,
    "credentialBackedUp" boolean NOT NULL,
    transports text
);


ALTER TABLE public.authenticator OWNER TO postgres;

--
-- Name: bots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bots (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    prompt text NOT NULL,
    avatar_type public.avatar_type DEFAULT 'url'::public.avatar_type NOT NULL,
    avatar character varying,
    url character varying,
    visibility character varying DEFAULT 'public'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    delete_at timestamp without time zone
);


ALTER TABLE public.bots OWNER TO postgres;

--
-- Name: bots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.bots ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: chats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chats (
    id text NOT NULL,
    "userId" text,
    title character varying(255) NOT NULL,
    history_type public.history_type DEFAULT 'count'::public.history_type NOT NULL,
    history_count integer DEFAULT 5 NOT NULL,
    search_enabled boolean DEFAULT false,
    default_model character varying,
    default_provider character varying,
    is_star boolean DEFAULT false,
    is_with_bot boolean DEFAULT false,
    bot_id integer,
    avatar character varying,
    avatar_type public.avatar_type DEFAULT 'none'::public.avatar_type NOT NULL,
    prompt text,
    star_at timestamp without time zone,
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.chats OWNER TO postgres;

--
-- Name: group_models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_models (
    "groupId" integer NOT NULL,
    "modelId" integer NOT NULL
);


ALTER TABLE public.group_models OWNER TO postgres;

--
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    monthly_token_limit integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.groups ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: llm_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.llm_settings (
    provider character varying(255) NOT NULL,
    "providerName" character varying(255) NOT NULL,
    apikey character varying(255),
    endpoint character varying(255),
    is_active boolean,
    api_style public.api_style DEFAULT 'openai'::public.api_style NOT NULL,
    type public.llm_type DEFAULT 'default'::public.llm_type NOT NULL,
    logo character varying(255),
    "order" integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.llm_settings OWNER TO postgres;

--
-- Name: mcp_servers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mcp_servers (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    type public.mcp_server_type DEFAULT 'stdio'::public.mcp_server_type NOT NULL,
    base_url text,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.mcp_servers OWNER TO postgres;

--
-- Name: mcp_tools; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mcp_tools (
    id text NOT NULL,
    name text NOT NULL,
    server_id text NOT NULL,
    description text,
    input_schema json
);


ALTER TABLE public.mcp_tools OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    "userId" text NOT NULL,
    "chatId" text NOT NULL,
    role character varying(255) NOT NULL,
    content json,
    reasonin_content text,
    model character varying(255),
    "providerId" character varying(255) NOT NULL,
    message_type character varying DEFAULT 'text'::character varying NOT NULL,
    search_enabled boolean DEFAULT false,
    web_search json,
    search_status public.search_status DEFAULT 'none'::public.search_status NOT NULL,
    mcp_tools json,
    input_tokens integer,
    output_tokens integer,
    total_tokens integer,
    error_type character varying,
    error_message character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    delete_at timestamp without time zone
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.messages ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.models (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    "displayName" character varying(255) NOT NULL,
    "maxTokens" integer,
    support_vision boolean DEFAULT false,
    support_tool boolean DEFAULT false,
    built_in_image_gen boolean DEFAULT false,
    built_in_web_search boolean DEFAULT false,
    selected boolean DEFAULT true,
    "providerId" character varying(255) NOT NULL,
    "providerName" character varying(255) NOT NULL,
    type public.model_type DEFAULT 'default'::public.model_type NOT NULL,
    "order" integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.models OWNER TO postgres;

--
-- Name: models_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.models ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.models_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: search_engine_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.search_engine_config (
    id text NOT NULL,
    name text NOT NULL,
    api_key text,
    max_results integer DEFAULT 5 NOT NULL,
    extract_keywords boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT false NOT NULL
);


ALTER TABLE public.search_engine_config OWNER TO postgres;

--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: usage_report; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage_report (
    date date NOT NULL,
    user_id text NOT NULL,
    model_id integer NOT NULL,
    provider_id text NOT NULL,
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.usage_report OWNER TO postgres;

--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text,
    email text,
    password text,
    "emailVerified" timestamp without time zone,
    "isAdmin" boolean DEFAULT false,
    image text,
    "groupId" integer,
    today_total_tokens integer DEFAULT 0 NOT NULL,
    current_month_total_tokens integer DEFAULT 0 NOT NULL,
    usage_updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: verification_token; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verification_token (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp without time zone NOT NULL
);


ALTER TABLE public.verification_token OWNER TO postgres;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public.app_settings OWNER TO postgres;

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);

--
-- Data for Name: bots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bots (id, name, description, prompt, avatar_type, avatar, url, visibility, created_at, updated_at, delete_at) FROM stdin;
1	智能助手示例	这是一个示例智能体，展示如何创建和使用智能体。	# Role: 智能助手示例\n\n## Profile:\n- 名称: 智能助手示例\n- 版本: 1.0\n- 语言: 中文\n- 描述: 一个友好的智能助手，可以帮助用户解答问题和提供建议\n\n## Background:\n我是一个示例智能体，旨在展示FiveChat平台的智能体功能。我可以与用户进行自然对话，提供有用的信息和建议。\n\n## Goals:\n1. 友好地与用户交流\n2. 提供准确和有用的信息\n3. 展示智能体的基本功能\n\n## Skills:\n1. 自然语言理解和生成\n2. 问题解答\n3. 建议提供\n4. 友好交流\n\n## Constraints:\n1. 保持友好和专业的态度\n2. 提供准确的信息\n3. 尊重用户隐私\n\n## Workflow:\n1. 友好地问候用户\n2. 了解用户的需求\n3. 提供相应的帮助和建议\n4. 保持积极的交流氛围\n\n## Initialization:\n你好！我是智能助手示例，很高兴为您服务。我可以帮助您解答问题、提供建议或者只是简单地聊天。请告诉我，今天我可以为您做些什么？	emoji	🤖	\N	public	2025-06-28 00:59:11.921	2025-06-28 08:59:11.949638	NULL
\.

--
-- Data for Name: llm_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.llm_settings (provider, "providerName", apikey, endpoint, is_active, api_style, type, logo, "order", created_at, updated_at) FROM stdin;
openai	OpenAI	\N	\N	\N	openai	default	/images/providers/openai.svg	1	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
claude	Claude	\N	\N	\N	claude	default	/images/providers/claude.svg	2	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
gemini	Gemini	\N	\N	\N	gemini	default	/images/providers/gemini.svg	3	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
deepseek	Deepseek	\N	\N	\N	openai	default	/images/providers/deepseek.svg	4	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
moonshot	Moonshot	\N	\N	\N	openai	default	/images/providers/moonshot.svg	5	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
qwen	通义千问	\N	\N	\N	openai	default	/images/providers/qwen.svg	6	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
volcengine	火山方舟(豆包)	\N	\N	\N	openai	default	/images/providers/volcengine.svg	7	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
qianfan	百度云千帆	\N	\N	\N	openai	default	/images/providers/qianfan.svg	8	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
grok	Grok	\N	\N	\N	openai	default	/images/providers/grok.svg	9	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
hunyuan	腾讯混元	\N	\N	\N	openai	default	/images/providers/hunyuan.svg	10	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
openrouter	OpenRouter	\N	\N	\N	openai	default	/images/providers/openrouter.svg	11	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
zhipu	智谱	\N	\N	\N	openai	default	/images/providers/zhipu.svg	12	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
siliconflow	硅基流动	\N	\N	\N	openai	default	/images/providers/siliconflow.svg	13	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
ollama	Ollama	\N	\N	\N	openai	default	/images/providers/ollama.svg	14	2025-06-28 00:59:09.3	2025-06-28 00:59:09.3
\.

--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);

--
-- Name: authenticator authenticator_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authenticator
    ADD CONSTRAINT authenticator_pkey PRIMARY KEY ("credentialID");

--
-- Name: bots bots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bots
    ADD CONSTRAINT bots_pkey PRIMARY KEY (id);

--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);

--
-- Name: group_models group_models_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_models
    ADD CONSTRAINT group_models_pkey PRIMARY KEY ("groupId", "modelId");

--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);

--
-- Name: llm_settings llm_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.llm_settings
    ADD CONSTRAINT llm_settings_pkey PRIMARY KEY (provider);

--
-- Name: mcp_servers mcp_servers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mcp_servers
    ADD CONSTRAINT mcp_servers_pkey PRIMARY KEY (id);

--
-- Name: mcp_tools mcp_tools_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mcp_tools
    ADD CONSTRAINT mcp_tools_pkey PRIMARY KEY (id);

--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

--
-- Name: models models_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.models
    ADD CONSTRAINT models_pkey PRIMARY KEY (id);

--
-- Name: search_engine_config search_engine_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_engine_config
    ADD CONSTRAINT search_engine_config_pkey PRIMARY KEY (id);

--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY ("sessionToken");

--
-- Name: usage_report usage_report_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_report
    ADD CONSTRAINT usage_report_pkey PRIMARY KEY (date, user_id, model_id, provider_id);

--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);

--
-- Name: verification_token verification_token_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_token
    ADD CONSTRAINT verification_token_pkey PRIMARY KEY (identifier, token);

--
-- PostgreSQL database dump complete
--
