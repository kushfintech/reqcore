CREATE TYPE "public"."template_category" AS ENUM('interview', 'rejection');--> statement-breakpoint
ALTER TABLE "email_template" ADD COLUMN "category" "template_category" DEFAULT 'interview' NOT NULL;