ALTER TABLE "company_profiles" ADD COLUMN "business_address" text;--> statement-breakpoint
ALTER TABLE "company_profiles" ADD COLUMN "website" varchar(256);--> statement-breakpoint
ALTER TABLE "company_profiles" ADD COLUMN "incorporation_date" varchar(64);--> statement-breakpoint
ALTER TABLE "company_profiles" ADD COLUMN "number_of_directors" integer;--> statement-breakpoint
ALTER TABLE "company_profiles" ADD COLUMN "external_auditor" varchar(256);--> statement-breakpoint
ALTER TABLE "company_profiles" ADD COLUMN "fiscal_year_end" varchar(32);--> statement-breakpoint
ALTER TABLE "company_profiles" ADD COLUMN "wikipedia_title" varchar(256);--> statement-breakpoint
ALTER TABLE "company_profiles" ADD COLUMN "wikipedia_summary" text;--> statement-breakpoint
ALTER TABLE "company_profiles" ADD COLUMN "wikipedia_url" varchar(512);