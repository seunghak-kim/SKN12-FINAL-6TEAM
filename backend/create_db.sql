-- public.friends definition

-- Drop table

-- DROP TABLE public.friends;

CREATE TABLE public.friends ( friends_id serial4 NOT NULL, friends_name varchar(10) NOT NULL, friends_description text NOT NULL, tts_audio_url varchar(2048) NULL, tts_voice_type int4 NULL, is_active bool NULL, created_at timestamp NULL, CONSTRAINT friends_pkey PRIMARY KEY (friends_id));

-- Permissions

ALTER TABLE public.friends OWNER TO postgres;
GRANT ALL ON TABLE public.friends TO postgres;


-- public.social_users definition

-- Drop table

-- DROP TABLE public.social_users;

CREATE TABLE public.social_users ( social_user_id serial4 NOT NULL, social_id varchar(255) NOT NULL, CONSTRAINT social_users_pkey PRIMARY KEY (social_user_id), CONSTRAINT social_users_social_id_key UNIQUE (social_id));

-- Permissions

ALTER TABLE public.social_users OWNER TO postgres;
GRANT ALL ON TABLE public.social_users TO postgres;


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users ( user_id serial4 NOT NULL, user_password varchar(255) NOT NULL, CONSTRAINT users_pkey PRIMARY KEY (user_id));

-- Permissions

ALTER TABLE public.users OWNER TO postgres;
GRANT ALL ON TABLE public.users TO postgres;


-- public.user_informations definition

-- Drop table

-- DROP TABLE public.user_informations;

CREATE TABLE public.user_informations ( user_id serial4 NOT NULL, nickname varchar(20) NOT NULL, status varchar(10) NOT NULL, created_at timestamp DEFAULT now() NOT NULL, deleted_at timestamp NULL, social_user_id int4 NULL, regular_user_id int4 NULL, CONSTRAINT user_informations_pkey PRIMARY KEY (user_id), CONSTRAINT user_informations_regular_user_id_fkey FOREIGN KEY (regular_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE, CONSTRAINT user_informations_social_user_id_fkey FOREIGN KEY (social_user_id) REFERENCES public.social_users(social_user_id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE public.user_informations OWNER TO postgres;
GRANT ALL ON TABLE public.user_informations TO postgres;


-- public.agreements definition

-- Drop table

-- DROP TABLE public.agreements;

CREATE TABLE public.agreements ( agreement_id serial4 NOT NULL, user_id int4 NOT NULL, is_agree bool NULL, agreed_at timestamp DEFAULT now() NOT NULL, CONSTRAINT agreements_pkey PRIMARY KEY (agreement_id), CONSTRAINT agreements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_informations(user_id));

-- Permissions

ALTER TABLE public.agreements OWNER TO postgres;
GRANT ALL ON TABLE public.agreements TO postgres;


-- public.chat_sessions definition

-- Drop table

-- DROP TABLE public.chat_sessions;

CREATE TABLE public.chat_sessions ( chat_sessions_id uuid NOT NULL, user_id int4 NULL, friends_id int4 NULL, session_name varchar(255) NULL, is_active bool NULL, created_at timestamp NULL, updated_at timestamp NULL, CONSTRAINT chat_sessions_pkey PRIMARY KEY (chat_sessions_id), CONSTRAINT chat_sessions_friends_id_fkey FOREIGN KEY (friends_id) REFERENCES public.friends(friends_id), CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_informations(user_id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE public.chat_sessions OWNER TO postgres;
GRANT ALL ON TABLE public.chat_sessions TO postgres;


-- public.drawing_tests definition

-- Drop table

-- DROP TABLE public.drawing_tests;

CREATE TABLE public.drawing_tests ( test_id serial4 NOT NULL, user_id int4 NOT NULL, image_url varchar(2048) NULL, submitted_at timestamp DEFAULT now() NOT NULL, CONSTRAINT drawing_tests_pkey PRIMARY KEY (test_id), CONSTRAINT drawing_tests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_informations(user_id));

-- Permissions

ALTER TABLE public.drawing_tests OWNER TO postgres;
GRANT ALL ON TABLE public.drawing_tests TO postgres;


-- public.ratings definition

-- Drop table

-- DROP TABLE public.ratings;

CREATE TABLE public.ratings ( ratings_id serial4 NOT NULL, session_id uuid NOT NULL, user_id int4 NOT NULL, friends_id int4 NOT NULL, rating int4 NOT NULL, "comment" text NULL, created_at timestamp DEFAULT now() NOT NULL, CONSTRAINT ratings_pkey PRIMARY KEY (ratings_id), CONSTRAINT ratings_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(chat_sessions_id) ON DELETE CASCADE, CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_informations(user_id) ON DELETE CASCADE, CONSTRAINT ratings_friends_id_fkey FOREIGN KEY (friends_id) REFERENCES public.friends(friends_id));

-- Permissions

ALTER TABLE public.ratings OWNER TO postgres;
GRANT ALL ON TABLE public.ratings TO postgres;


-- public.chat_messages definition

-- Drop table

-- DROP TABLE public.chat_messages;

CREATE TABLE public.chat_messages ( chat_messages_id uuid NOT NULL, session_id uuid NULL, sender_type varchar(20) NOT NULL, "content" text NOT NULL, created_at timestamp NULL, CONSTRAINT chat_messages_pkey PRIMARY KEY (chat_messages_id), CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(chat_sessions_id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE public.chat_messages OWNER TO postgres;
GRANT ALL ON TABLE public.chat_messages TO postgres;


-- public.drawing_test_results definition

-- Drop table

-- DROP TABLE public.drawing_test_results;

CREATE TABLE public.drawing_test_results ( result_id serial4 NOT NULL, test_id int4 NOT NULL, friends_type int4 NULL, summary_text text NULL, created_at timestamp DEFAULT now() NOT NULL, CONSTRAINT drawing_test_results_pkey PRIMARY KEY (result_id), CONSTRAINT drawing_test_results_test_id_key UNIQUE (test_id), CONSTRAINT drawing_test_results_friends_type_fkey FOREIGN KEY (friends_type) REFERENCES public.friends(friends_id), CONSTRAINT drawing_test_results_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.drawing_tests(test_id));

-- Permissions

ALTER TABLE public.drawing_test_results OWNER TO postgres;
GRANT ALL ON TABLE public.drawing_test_results TO postgres;

-- personality_scores 컬럼 추가
ALTER TABLE drawing_test_results ADD COLUMN personality_scores JSON;

-- INSERT INTO friends (friends_name,friends_description,tts_audio_url,tts_voice_type,is_active,created_at) VALUES
--	 ('추진형','목표 지향적이고 도전적인 성격의 친구입니다. 항상 앞으로 나아가려 하고, 문제 해결을 위해 적극적으로 행동합니다.',NULL,NULL,true,'2025-07-17 17:23:42.919576'),
--	 ('내면형','깊이 있는 사고와 성찰을 좋아하는 친구입니다. 조용하고 차분하며, 내적 성장과 자기 이해를 중요시합니다.',NULL,NULL,true,'2025-07-17 17:24:29.849924'),
--	 ('관계형','사람들과의 관계를 중시하고 소통을 즐기는 친구입니다. 공감 능력이 뛰어나고 다른 사람들과 함께 시간을 보내는 것을 좋아합니다.',NULL,NULL,true,'2025-07-17 17:24:38.821091'),
--	 ('쾌락형','즐거움과 재미를 추구하는 친구입니다. 활기차고 유쾌하며, 새로운 경험과 모험을 즐기고 긍정적인 에너지를 전파합니다.',NULL,NULL,true,'2025-07-17 17:24:47.037083'),
--	 ('안정형','안정감과 평온함을 중시하는 친구입니다. 차분하고 신중하며, 예측 가능한 환경에서 꾸준히 성장하는 것을 선호합니다.',NULL,NULL,true,'2025-07-17 17:24:54.018487');
