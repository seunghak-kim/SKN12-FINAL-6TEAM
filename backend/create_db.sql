CREATE TABLE IF NOT EXISTS "personas" (
  "persona_id" serial4 NOT NULL,
  "name" varchar(10) NOT NULL,
  "description" text NOT NULL,
  "is_active" bool,
  "created_at" timestamp,
  PRIMARY KEY ("persona_id")
);

CREATE TABLE IF NOT EXISTS "social_users" (
  "social_user_id" serial4 NOT NULL,
  "social_id" varchar(255) NOT NULL,
  PRIMARY KEY ("social_user_id")
);

CREATE TABLE IF NOT EXISTS "users" (
  "user_id" serial4 NOT NULL,
  "user_password" varchar(255) NOT NULL,
  PRIMARY KEY ("user_id")
);

CREATE TABLE IF NOT EXISTS "user_informations" (
  "user_id" serial4 NOT NULL,
  "nickname" varchar(20) NOT NULL,
  "profile_image_url" varchar(500),
  "status" varchar(10) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "deleted_at" timestamp,
  "social_user_id" int4,
  "regular_user_id" int4,
  PRIMARY KEY ("user_id")
);

CREATE TABLE IF NOT EXISTS "agreements" (
  "agreement_id" serial4 NOT NULL,
  "user_id" int4 NOT NULL,
  "is_agree" bool,
  "agreed_at" timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY ("agreement_id")
);

CREATE TABLE IF NOT EXISTS "chat_sessions" (
  "chat_sessions_id" uuid NOT NULL,
  "user_id" int4,
  "persona_id" int4,
  "session_name" varchar(255),
  "is_active" bool,
  "created_at" timestamp,
  "updated_at" timestamp,
  PRIMARY KEY ("chat_sessions_id")
);

CREATE TABLE IF NOT EXISTS "drawing_tests" (
  "test_id" serial4 NOT NULL,
  "user_id" int4 NOT NULL,
  "image_url" varchar(2048),
  "submitted_at" timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY ("test_id")
);

CREATE TABLE IF NOT EXISTS "ratings" (
  "ratings_id" serial4 NOT NULL,
  "session_id" uuid NOT NULL,
  "user_id" int4 NOT NULL,
  "persona_id" int4 NOT NULL,
  "rating" int4 NOT NULL,
  "comment" text,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY ("ratings_id")
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "chat_messages_id" uuid NOT NULL,
  "session_id" uuid,
  "sender_type" varchar(20) NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp,
  PRIMARY KEY ("chat_messages_id")
);

CREATE TABLE IF NOT EXISTS "drawing_test_results" (
  "result_id" serial4 NOT NULL,
  "test_id" int4 NOT NULL,
  "persona_type" int4,
  "summary_text" text,
  "dog_scores" decimal(5,2),
  "cat_scores" decimal(5,2),
  "rabbit_scores" decimal(5,2),
  "bear_scores" decimal(5,2),
  "turtle_scores" decimal(5,2),
  "thumbs_up" int4,
  "thumbs_down" int4,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY ("result_id")
);

CREATE UNIQUE INDEX "social_users_social_id_key" ON "social_users" ("social_id");

CREATE UNIQUE INDEX "drawing_test_results_test_id_key" ON "drawing_test_results" ("test_id");

ALTER TABLE "user_informations" ADD CONSTRAINT "user_informations_regular_user_id_fkey" FOREIGN KEY ("regular_user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE;

ALTER TABLE "user_informations" ADD CONSTRAINT "user_informations_social_user_id_fkey" FOREIGN KEY ("social_user_id") REFERENCES "social_users" ("social_user_id") ON DELETE CASCADE;

ALTER TABLE "agreements" ADD CONSTRAINT "agreements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_informations" ("user_id") ON DELETE CASCADE;

ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas" ("persona_id");

ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_informations" ("user_id") ON DELETE CASCADE;

ALTER TABLE "drawing_tests" ADD CONSTRAINT "drawing_tests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_informations" ("user_id") ON DELETE CASCADE;

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions" ("chat_sessions_id") ON DELETE CASCADE;

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_informations" ("user_id") ON DELETE CASCADE;

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas" ("persona_id");

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions" ("chat_sessions_id") ON DELETE CASCADE;

ALTER TABLE "drawing_test_results" ADD CONSTRAINT "drawing_test_results_persona_type_fkey" FOREIGN KEY ("persona_type") REFERENCES "personas" ("persona_id");

ALTER TABLE "drawing_test_results" ADD CONSTRAINT "drawing_test_results_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "drawing_tests" ("test_id") ON DELETE CASCADE;

-- user_informations에서 social_user_id와 regular_user_id가 모두 NULL이면 해당 레코드 삭제하는 트리거
-- CREATE OR REPLACE FUNCTION cleanup_orphaned_user_informations()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     -- social_user_id와 regular_user_id가 모두 NULL인 user_informations 레코드 삭제
--     DELETE FROM user_informations 
--     WHERE social_user_id IS NULL AND regular_user_id IS NULL;
    
--     RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;

-- -- social_users 삭제 후 트리거
-- CREATE TRIGGER trigger_cleanup_after_social_users_delete
--     AFTER DELETE ON social_users
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION cleanup_orphaned_user_informations();

-- -- users 삭제 후 트리거  
-- CREATE TRIGGER trigger_cleanup_after_users_delete
--     AFTER DELETE ON users
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION cleanup_orphaned_user_informations();
