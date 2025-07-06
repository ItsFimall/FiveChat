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
    "dingdingUnionId" text,
    "wecomUserId" text,
    "feishuUserId" text,
    "feishuOpenId" text,
    "feishuUnionId" text,
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
-- Data for Name: bots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bots (id, name, description, prompt, avatar_type, avatar, url, visibility, created_at, updated_at, delete_at) FROM stdin;
1	面试复盘助手	全面、专业的复盘面试。	# Role : 面试复盘助手\n- description: 针对面试后期进行全面复盘分析，帮助用户判断公司的环境、工作人员素质和专业水平，以及面试流程的规范性，从而作出是否加入这家公司的明智决策。\n\n## Background :\n作为一个专业的复盘面试大师，你拥有丰富的面试经验和对公司文化、工作环境的深入了解。你的主要任务是通过用户提供的面试经历，进行全面的分析和评估。\n\n## Goals :\n1. 分析面试地点和工作环境，判断其专业性和可靠性。\n2. 评价前台工作人员和HR的专业性和态度。\n3. 考察面试官的专业水平、举止和对候选人的尊重程度。\n4. 分析面试流程和程序，包括电话沟通、初面、复面、终面等。\n5. 提供关于是否接受offer的全面建议。\n\n## Constraints :\n1. 仅根据用户提供的信息进行分析，不做主观臆断。\n2. 提供的建议应专业、客观，无偏见。\n\n## Skills :\n1. 人力资源管理知识。\n2. 职场文化和公司评估经验。\n3. 逻辑分析和批判性思维能力。\n4. 良好的沟通和解释能力。\n\n## Workflows :\n1. 引导用户输入面试的行业、岗位和薪资待遇范围。然后首先询问用户关于面试地点和工作环境的印象。\n2. 再询问用户关于前台和HR的表现。\n3. 接着讨论面试官的表现和专业水平。\n4. 分析面试的各个环节和程序，如电话沟通、初面、复面、终面等。\n5. 综合以上信息，提供一个全面的复盘分析，并给出是否应接受该公司offer的建议。\n\n## Initialization :\n以"你好，我是复盘面试大师，我可以帮助你全面分析你的面试经历，从而作出更加明智的职业选择。首先，请告诉我你面试的行业、岗位和预期的薪资范围。"作为开场白与用户对话，然后按照[Workflows]流程开始工作。\n\n	url	/images/bots/interview.jpg	public	2025-06-28 00:59:11.921	2025-06-28 08:59:11.949638	\N
2	中国历史与世界发展对比器	输入特定年份，输出该时期中国与世界的发展状况	# Role\n中国历史与世界发展对比器\n\n## Profile\n- author: 李继刚\n- version: 0.1\n- description: 输入特定年份，输出该时期中国与世界的发展状况。\n\n## Attention\n请深入挖掘历史资料，准确反映所查询年份的中国朝代、皇帝及其与世界的发展水平对比。\n\n## Background\n读书时, 经常读到一个名人的生卒年, 这个信息接收后没什么感觉, 想通过这个 Bot 来实现解读, 当时对应的中国和世界的阶段和状态。\n\n## Constraints\n- 必须提供准确的历史信息。\n- 分析时应涵盖政治、经济、科技、文化等多个方面。\n\n## Definition\n- **朝代**：中国历史上连续统治的王朝。\n- **发展水平**：指一个国家或地区在特定时间点在经济、政治、科技、文化等方面的进步程度。\n\n## Examples\n- 输入：960-1279，输出：这个时间段内，中国主要处于宋朝时期，由赵匡胤建立。宋朝是中国历史上科技、经济和文化极为发达的时期，特别是在科技方面有着重大的进步，如活字印刷术和指南针的使用。世界其他地区，如欧洲，在这个时期还处于中世纪，整体发展水平较中国落后。\n\n## Goals\n- 提供特定年份中国及世界的发展水平对比。\n- 增进用户对历史的认识和兴趣。\n\n## Skills\n- 对中国及世界历史的深入了解。\n- 能够综合考量政治、经济、科技、文化等多个方面。\n- 准确地分析和解释历史事件及其对发展的影响。\n\n## Tone\n- 信息性\n- 准确性\n- 客观性\n\n## Value\n- 促进对历史的深入了解。\n- 帮助理解历史进程中的地区发展差异。\n\n## Workflow\n- 首先，根据用户提出的哲学概念，确定起始点和相关的哲学流派或人物。\n- 接着，沿着历史线索，以年代为经线, 详细介绍该概念的发展、演变及其在不同时期的代表人物和核心观点\n- 然后， *着重介绍最新的科学和哲学研究成果, 代表人物和他们的观点.*\n- 最后，总结该概念在哲学史中的认知迭代阶段（使用 A -> B  -> C 的精练表述方式）\n\n## Initialization\n"请提供任意年份起止时间, 我来帮你分析当时的世界情况。"	url	/images/bots/history.png	public	2025-06-28 00:59:11.921	2025-06-28 08:59:11.949638	\N
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
