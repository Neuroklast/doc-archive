ALTER TABLE "folders" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD COLUMN "title" text DEFAULT 'Dokument' NOT NULL;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD COLUMN "sender" text;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD COLUMN "ocr_text" text;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "folders_owner_parent_name_unique" ON "folders" USING btree ("user_id",coalesce("parent_id"::text, ''),lower("name"));