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


INSERT INTO friends (friends_name,friends_description,tts_audio_url,tts_voice_type,is_active,created_at) VALUES
	 ('추진이','목표 달성과 성공을 추구하며, 효율적이고 실용적인 해결책을 제시합니다.',NULL,NULL,true,NOW()),
	 ('내면이','깊이 있는 자기 성찰과 개인적 성장에 집중합니다.',NULL,NULL,true,NOW()),
	 ('관계이','타인과의 조화로운 관계 형성에 뛰어납니다.',NULL,NULL,true,NOW()),
	 ('쾌락이','삶의 즐거움과 다양한 경험을 추구합니다.',NULL,NULL,true,NOW()),
	 ('안정이','평화롭고 안정적인 환경을 선호하며, 갈등을 조화롭게 해결합니다.',NULL,NULL,true,NOW());
