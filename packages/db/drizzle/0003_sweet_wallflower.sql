CREATE TABLE "event_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"paused" boolean DEFAULT false NOT NULL,
	"team_chat_limit" integer DEFAULT 500 NOT NULL,
	CONSTRAINT "event_singleton" CHECK ("event_settings"."id" = 1),
	CONSTRAINT "event_dates_valid" CHECK ("event_settings"."ends_at" IS NULL OR "event_settings"."starts_at" IS NULL OR "event_settings"."ends_at" > "event_settings"."starts_at"),
	CONSTRAINT "event_chat_limit_positive" CHECK ("event_settings"."team_chat_limit" > 0)
);
--> statement-breakpoint
CREATE TABLE "organizer_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
