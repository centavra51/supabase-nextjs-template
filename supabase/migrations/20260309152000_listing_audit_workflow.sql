create type "public"."audit_status" as enum ('draft', 'queued', 'processing', 'completed', 'failed');
create type "public"."generation_kind" as enum (
    'audit_summary',
    'title_rewrite',
    'bullets_rewrite',
    'description_rewrite',
    'backend_keywords',
    'competitor_summary'
);
create type "public"."plan_code" as enum ('free', 'starter', 'pro', 'agency');

create or replace function "public"."set_updated_at"()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table "public"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "owner" uuid not null,
    "name" text not null,
    "marketplace" text not null default 'amazon.com',
    "default_language" text not null default 'en',
    "brand_name" text,
    "primary_category" text,
    "product_type" text,
    "target_customer" text
);

create table "public"."listing_audits" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "owner" uuid not null,
    "project_id" uuid,
    "status" public.audit_status not null default 'draft',
    "asin" text,
    "marketplace" text not null default 'amazon.com',
    "locale" text not null default 'en',
    "listing_url" text,
    "product_title" text,
    "bullet_points" jsonb not null default '[]'::jsonb,
    "product_description" text,
    "backend_keywords" text,
    "brand_name" text,
    "category_name" text,
    "price_amount" numeric(10,2),
    "currency_code" text,
    "image_count" integer,
    "input_json" jsonb not null default '{}'::jsonb,
    "normalized_json" jsonb not null default '{}'::jsonb,
    "score_json" jsonb not null default '{}'::jsonb,
    "issues_json" jsonb not null default '[]'::jsonb,
    "recommendations_json" jsonb not null default '[]'::jsonb,
    "result_json" jsonb not null default '{}'::jsonb,
    "overall_score" integer,
    "seo_score" integer,
    "conversion_score" integer,
    "compliance_score" integer,
    "readability_score" integer,
    "rating" numeric(3,2),
    "review_count" integer,
    "analyzed_at" timestamp with time zone
);

create table "public"."competitors" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "owner" uuid not null,
    "project_id" uuid not null,
    "listing_audit_id" uuid,
    "asin" text not null,
    "marketplace" text not null default 'amazon.com',
    "title" text,
    "bullet_points" jsonb not null default '[]'::jsonb,
    "description" text,
    "price_amount" numeric(10,2),
    "currency_code" text,
    "rating" numeric(3,2),
    "review_count" integer,
    "raw_json" jsonb not null default '{}'::jsonb,
    "comparison_json" jsonb not null default '{}'::jsonb
);

create table "public"."ai_generations" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "owner" uuid not null,
    "project_id" uuid,
    "listing_audit_id" uuid,
    "competitor_id" uuid,
    "kind" public.generation_kind not null,
    "model_name" text,
    "prompt_version" text,
    "input_json" jsonb not null default '{}'::jsonb,
    "output_json" jsonb not null default '{}'::jsonb,
    "tokens_input" integer,
    "tokens_output" integer
);

create table "public"."usage_limits" (
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "plan" public.plan_code not null default 'free',
    "period_start" date not null default current_date,
    "period_end" date not null default (current_date + 30),
    "audit_credits_monthly" integer not null default 5,
    "audits_used" integer not null default 0,
    "ai_credits_monthly" integer not null default 10,
    "ai_used" integer not null default 0,
    "competitor_credits_monthly" integer not null default 10,
    "competitors_used" integer not null default 0,
    "stripe_customer_id" text,
    "stripe_subscription_id" text
);

alter table "public"."projects" add constraint "projects_pkey" primary key ("id");
alter table "public"."listing_audits" add constraint "listing_audits_pkey" primary key ("id");
alter table "public"."competitors" add constraint "competitors_pkey" primary key ("id");
alter table "public"."ai_generations" add constraint "ai_generations_pkey" primary key ("id");
alter table "public"."usage_limits" add constraint "usage_limits_pkey" primary key ("user_id");

alter table "public"."projects"
    add constraint "projects_owner_fkey"
    foreign key ("owner") references auth.users("id") on update cascade on delete cascade not valid;
alter table "public"."projects" validate constraint "projects_owner_fkey";

alter table "public"."listing_audits"
    add constraint "listing_audits_owner_fkey"
    foreign key ("owner") references auth.users("id") on update cascade on delete cascade not valid;
alter table "public"."listing_audits" validate constraint "listing_audits_owner_fkey";
alter table "public"."listing_audits"
    add constraint "listing_audits_project_id_fkey"
    foreign key ("project_id") references public.projects("id") on update cascade on delete set null not valid;
alter table "public"."listing_audits" validate constraint "listing_audits_project_id_fkey";

alter table "public"."competitors"
    add constraint "competitors_owner_fkey"
    foreign key ("owner") references auth.users("id") on update cascade on delete cascade not valid;
alter table "public"."competitors" validate constraint "competitors_owner_fkey";
alter table "public"."competitors"
    add constraint "competitors_project_id_fkey"
    foreign key ("project_id") references public.projects("id") on update cascade on delete cascade not valid;
alter table "public"."competitors" validate constraint "competitors_project_id_fkey";
alter table "public"."competitors"
    add constraint "competitors_listing_audit_id_fkey"
    foreign key ("listing_audit_id") references public.listing_audits("id") on update cascade on delete cascade not valid;
alter table "public"."competitors" validate constraint "competitors_listing_audit_id_fkey";

alter table "public"."ai_generations"
    add constraint "ai_generations_owner_fkey"
    foreign key ("owner") references auth.users("id") on update cascade on delete cascade not valid;
alter table "public"."ai_generations" validate constraint "ai_generations_owner_fkey";
alter table "public"."ai_generations"
    add constraint "ai_generations_project_id_fkey"
    foreign key ("project_id") references public.projects("id") on update cascade on delete set null not valid;
alter table "public"."ai_generations" validate constraint "ai_generations_project_id_fkey";
alter table "public"."ai_generations"
    add constraint "ai_generations_listing_audit_id_fkey"
    foreign key ("listing_audit_id") references public.listing_audits("id") on update cascade on delete cascade not valid;
alter table "public"."ai_generations" validate constraint "ai_generations_listing_audit_id_fkey";
alter table "public"."ai_generations"
    add constraint "ai_generations_competitor_id_fkey"
    foreign key ("competitor_id") references public.competitors("id") on update cascade on delete set null not valid;
alter table "public"."ai_generations" validate constraint "ai_generations_competitor_id_fkey";

alter table "public"."usage_limits"
    add constraint "usage_limits_user_id_fkey"
    foreign key ("user_id") references auth.users("id") on update cascade on delete cascade not valid;
alter table "public"."usage_limits" validate constraint "usage_limits_user_id_fkey";

create index "projects_owner_idx" on "public"."projects" ("owner");
create index "listing_audits_owner_created_at_idx" on "public"."listing_audits" ("owner", "created_at" desc);
create index "listing_audits_project_id_idx" on "public"."listing_audits" ("project_id");
create index "competitors_owner_listing_audit_id_idx" on "public"."competitors" ("owner", "listing_audit_id", "created_at" desc);
create index "ai_generations_owner_listing_audit_id_idx" on "public"."ai_generations" ("owner", "listing_audit_id", "created_at" desc);

create trigger "set_projects_updated_at"
before update on "public"."projects"
for each row
execute function "public"."set_updated_at"();

create trigger "set_listing_audits_updated_at"
before update on "public"."listing_audits"
for each row
execute function "public"."set_updated_at"();

create trigger "set_competitors_updated_at"
before update on "public"."competitors"
for each row
execute function "public"."set_updated_at"();

create trigger "set_usage_limits_updated_at"
before update on "public"."usage_limits"
for each row
execute function "public"."set_updated_at"();

alter table "public"."projects" enable row level security;
alter table "public"."listing_audits" enable row level security;
alter table "public"."competitors" enable row level security;
alter table "public"."ai_generations" enable row level security;
alter table "public"."usage_limits" enable row level security;

grant delete, insert, references, select, trigger, truncate, update on table "public"."projects" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."projects" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."projects" to "service_role";

grant delete, insert, references, select, trigger, truncate, update on table "public"."listing_audits" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."listing_audits" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."listing_audits" to "service_role";

grant delete, insert, references, select, trigger, truncate, update on table "public"."competitors" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."competitors" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."competitors" to "service_role";

grant delete, insert, references, select, trigger, truncate, update on table "public"."ai_generations" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."ai_generations" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."ai_generations" to "service_role";

grant delete, insert, references, select, trigger, truncate, update on table "public"."usage_limits" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."usage_limits" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."usage_limits" to "service_role";

create policy "Owner can manage projects"
on "public"."projects"
as permissive
for all
to authenticated
using ((authenticative.is_user_authenticated() and (owner = auth.uid())))
with check ((authenticative.is_user_authenticated() and (owner = auth.uid())));

create policy "Owner can manage listing audits"
on "public"."listing_audits"
as permissive
for all
to authenticated
using ((authenticative.is_user_authenticated() and (owner = auth.uid())))
with check ((authenticative.is_user_authenticated() and (owner = auth.uid())));

create policy "Owner can manage competitors"
on "public"."competitors"
as permissive
for all
to authenticated
using ((authenticative.is_user_authenticated() and (owner = auth.uid())))
with check ((authenticative.is_user_authenticated() and (owner = auth.uid())));

create policy "Owner can manage ai generations"
on "public"."ai_generations"
as permissive
for all
to authenticated
using ((authenticative.is_user_authenticated() and (owner = auth.uid())))
with check ((authenticative.is_user_authenticated() and (owner = auth.uid())));

create policy "Owner can manage usage limits"
on "public"."usage_limits"
as permissive
for all
to authenticated
using ((authenticative.is_user_authenticated() and (user_id = auth.uid())))
with check ((authenticative.is_user_authenticated() and (user_id = auth.uid())));
