


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."invite_role" AS ENUM (
    'staff',
    'admin',
    'marketing',
    'logistics',
    'analyst',
    'sales'
);


ALTER TYPE "public"."invite_role" OWNER TO "postgres";


CREATE TYPE "public"."post_type" AS ENUM (
    'idea',
    'task',
    'shoutout',
    'general'
);


ALTER TYPE "public"."post_type" OWNER TO "postgres";


CREATE TYPE "public"."sale_status" AS ENUM (
    'pending',
    'paid',
    'cancelled'
);


ALTER TYPE "public"."sale_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_user_delete"("p_organization_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check the user's profile and org match
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND organization_id = p_organization_id
        AND role IN ('owner', 'admin')
    );
END;
$$;


ALTER FUNCTION "public"."can_user_delete"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_org_access"("org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND organization_id = org_id
    );
$$;


ALTER FUNCTION "public"."check_user_org_access"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_product_with_recipe"("p_name" "text", "p_sale_price" numeric, "p_ingredients" "jsonb", "p_organization_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_new_product_id UUID;
    item JSONB;
BEGIN
    -- 1. Security Check: Verify user belongs to this organization (Profile Check)
    PERFORM 1 FROM profiles 
    WHERE organization_id = p_organization_id 
    AND id = auth.uid();
    
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('status', 'error', 'message', 'Access Denied: You are not a member of this organization');
    END IF;

    -- 2. Create the Product
    INSERT INTO finished_products (organization_id, name, sale_price, current_stock, is_active)
    VALUES (p_organization_id, p_name, p_sale_price, 0, true)
    RETURNING id INTO v_new_product_id;

    -- 3. Loop through ingredients and create recipes
    FOR item IN SELECT * FROM jsonb_array_elements(p_ingredients)
    LOOP
        INSERT INTO recipes (organization_id, finished_product_id, raw_material_id, qty_required, created_by)
        VALUES (
            p_organization_id,
            v_new_product_id,
            (item->>'raw_material_id')::UUID,
            (item->>'qty_required')::DECIMAL,
            auth.uid()
        );
    END LOOP;

    RETURN jsonb_build_object('status', 'success', 'product_id', v_new_product_id);
END;
$$;


ALTER FUNCTION "public"."create_product_with_recipe"("p_name" "text", "p_sale_price" numeric, "p_ingredients" "jsonb", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- 1. Create Organization
    INSERT INTO public.organizations (name, slug)
    VALUES (p_name, p_slug)
    RETURNING id INTO v_org_id;

    -- 2. Create Default Settings (CRITICAL: Prevents "Missing Settings" bugs)
    INSERT INTO public.organization_settings (
        organization_id, 
        module_inventory, 
        module_production, 
        module_recipes,
        theme_primary_color
    )
    VALUES (
        v_org_id, 
        true, true, true, -- Default Modules ON
        '#f97316'         -- Default Orange
    );

    -- 3. Link the Admin User
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, p_admin_uid, 'owner');

    -- 4. Add the Bots to this new Org (So AI works immediately)
    -- Sales Bot
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, '00000000-0000-0000-0000-000000000001', 'staff');
    -- Ops Bot
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, '00000000-0000-0000-0000-000000000002', 'admin');

    RETURN jsonb_build_object(
        'status', 'success', 
        'organization_id', v_org_id,
        'slug', p_slug
    );

EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Slug already exists');
WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- 1. Create Org
    INSERT INTO public.organizations (name, slug) VALUES (p_name, p_slug) RETURNING id INTO v_org_id;

    -- 2. Create Settings based on Type
    INSERT INTO public.organization_settings (
        organization_id, 
        module_inventory, 
        module_production, 
        module_recipes,
        theme_primary_color
    )
    VALUES (
        v_org_id, 
        true, -- Everyone gets Inventory
        p_is_crafting, -- Kitchen?
        p_is_crafting, -- Recipes?
        CASE WHEN p_is_crafting THEN '#f97316' ELSE '#3b82f6' END -- Orange for Food, Blue for Stock
    );

    -- 3. Link Admin
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, p_admin_uid, 'owner');

    -- 4. Add Bots
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES 
        (v_org_id, '00000000-0000-0000-0000-000000000001', 'staff'),
        (v_org_id, '00000000-0000-0000-0000-000000000002', 'admin');

    -- 5. Register Default Channel (Auto-generate a fake one for testing)
    INSERT INTO public.organization_channels (organization_id, platform, phone_number_id)
    VALUES (v_org_id, 'whatsapp', p_slug || '-wa');

    RETURN jsonb_build_object('status', 'success', 'slug', p_slug);
END;
$$;


ALTER FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean, "p_theme_color" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- 1. Create Organization
    INSERT INTO public.organizations (name, slug) 
    VALUES (p_name, p_slug) 
    RETURNING id INTO v_org_id;

    -- 2. Create Settings (The DNA)
    INSERT INTO public.organization_settings (
        organization_id, 
        module_inventory, 
        module_production, -- Kitchen
        module_recipes,    -- Recipes
        module_team,
        theme_primary_color,
        business_description
    )
    VALUES (
        v_org_id, 
        true, 
        p_is_crafting, -- TRUE = Kitchen, FALSE = No Kitchen
        p_is_crafting, 
        true,
        p_theme_color,
        'Welcome to ' || p_name
    );

    -- 3. Link Admin (The Membership)
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, p_admin_uid, 'owner');

    -- 4. FORCE UPDATE PROFILE (The Context Link)
    -- This ensures the user "sees" the org immediately upon login.
    UPDATE public.profiles
    SET 
        organization_id = v_org_id,
        is_admin = true -- Make them admin of their own org
    WHERE id = p_admin_uid;

    -- 5. Add Bots (The Staff)
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, '00000000-0000-0000-0000-000000000001', 'staff'), (v_org_id, '00000000-0000-0000-0000-000000000002', 'admin');

    -- 6. Register Channel (The Phone Number)
    INSERT INTO public.organization_channels (organization_id, platform, phone_number_id)
    VALUES (v_org_id, 'whatsapp', p_slug || '-wa');

    RETURN jsonb_build_object('status', 'success', 'slug', p_slug);
END;
$$;


ALTER FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean, "p_theme_color" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_type" "text" DEFAULT 'food'::"text", "p_theme_color" "text" DEFAULT '#3b82f6'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_org_id UUID;
    v_terminology jsonb;
    v_is_crafting boolean;
BEGIN
    -- Set terminology and crafting mode based on business type
    CASE p_type
        WHEN 'manufacturing' THEN
            v_terminology := '{
                "pantry": "Parts Depot", 
                "kitchen": "Assembly", 
                "recipes": "BOM", 
                "production": "Manufacturing"
            }'::jsonb;
            v_is_crafting := true;
        WHEN 'stock' THEN
            v_terminology := '{
                "pantry": "Warehouse", 
                "kitchen": "Packaging", 
                "recipes": "Bundle", 
                "production": "Fulfillment"
            }'::jsonb;
            v_is_crafting := false;
        ELSE -- food (default)
            v_terminology := '{
                "pantry": "Pantry", 
                "kitchen": "Kitchen", 
                "recipes": "Recipes", 
                "production": "Cooking"
            }'::jsonb;
            v_is_crafting := true;
    END CASE;

    -- 1. Create Organization
    INSERT INTO public.organizations (name, slug) 
    VALUES (p_name, p_slug) 
    RETURNING id INTO v_org_id;

    -- 2. Create Settings with type-specific configuration
    INSERT INTO public.organization_settings (
        organization_id, 
        module_inventory, 
        module_production, 
        module_recipes,    
        module_team,
        theme_primary_color,
        business_description,
        terminology
    )
    VALUES (
        v_org_id, 
        true,           -- Everyone gets inventory
        v_is_crafting,  -- Kitchen/Assembly for crafting types
        v_is_crafting,  -- Recipes/BOM for crafting types
        true,
        p_theme_color,
        'Welcome to ' || p_name,
        v_terminology
    );

    -- 3. Link Admin User
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, p_admin_uid, 'owner');

    -- 4. Update Profile with organization context
    UPDATE public.profiles
    SET 
        organization_id = v_org_id,
        is_admin = true
    WHERE id = p_admin_uid;

    -- 5. Add System Bots
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES 
        (v_org_id, '00000000-0000-0000-0000-000000000001', 'staff'),  -- Sales Bot
        (v_org_id, '00000000-0000-0000-0000-000000000002', 'admin'); -- Ops Bot

    -- 6. Register Default Channel
    INSERT INTO public.organization_channels (organization_id, platform, phone_number_id)
    VALUES (v_org_id, 'whatsapp', p_slug || '-wa');

    RETURN jsonb_build_object(
        'status', 'success', 
        'slug', p_slug, 
        'type', p_type,
        'organization_id', v_org_id
    );

EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Slug already exists');
WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_type" "text", "p_theme_color" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean, "p_theme_color" "text", "p_terminology" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_org_id UUID;
    v_final_terminology jsonb;
BEGIN
    -- Set default terminology if null
    IF p_terminology IS NULL THEN
        v_final_terminology := '{"kitchen": "Kitchen", "pantry": "Pantry", "recipes": "Recipes", "production": "Production"}'::jsonb;
    ELSE
        v_final_terminology := p_terminology;
    END IF;

    -- 1. Create Organization
    INSERT INTO public.organizations (name, slug) 
    VALUES (p_name, p_slug) 
    RETURNING id INTO v_org_id;

    -- 2. Create Settings
    INSERT INTO public.organization_settings (
        organization_id, 
        module_inventory, 
        module_production, 
        module_recipes,    
        module_team,
        theme_primary_color,
        business_description,
        terminology
    )
    VALUES (
        v_org_id, 
        true, 
        p_is_crafting, 
        p_is_crafting, 
        true,
        p_theme_color,
        'Welcome to ' || p_name,
        v_final_terminology
    );

    -- 3. LINK THE ADMIN (Update Profile directly. No Member table.)
    UPDATE public.profiles
    SET 
        organization_id = v_org_id,
        is_admin = true,
        role = 'owner',
        tags = '{}'
    WHERE id = p_admin_uid;

    -- 4. Register Channel (Default)
    INSERT INTO public.organization_channels (organization_id, platform, phone_number_id)
    VALUES (v_org_id, 'whatsapp', p_slug || '-wa');

    RETURN jsonb_build_object('status', 'success', 'slug', p_slug);

EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Slug already exists');
WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean, "p_theme_color" "text", "p_terminology" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_finished_product"("p_product_id" "uuid", "p_organization_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Check delete permission
    IF NOT public.can_user_delete(p_organization_id) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Access Denied: Insufficient permissions');
    END IF;
    
    -- Verify product belongs to org
    PERFORM 1 FROM finished_products WHERE id = p_product_id AND organization_id = p_organization_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Product not found');
    END IF;
    
    -- Soft delete (mark as inactive) instead of hard delete to preserve history
    UPDATE finished_products SET is_active = false WHERE id = p_product_id;
    
    RETURN jsonb_build_object('status', 'success', 'message', 'Product archived');
END;
$$;


ALTER FUNCTION "public"."delete_finished_product"("p_product_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_product_recipe"("p_product_id" "uuid", "p_organization_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Check delete permission
    IF NOT public.can_user_delete(p_organization_id) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Access Denied: Insufficient permissions');
    END IF;
    
    -- Verify product belongs to org
    PERFORM 1 FROM finished_products WHERE id = p_product_id AND organization_id = p_organization_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Product not found');
    END IF;
    
    -- Hard delete recipe entries (they can be recreated)
    DELETE FROM recipes WHERE finished_product_id = p_product_id AND organization_id = p_organization_id;
    
    RETURN jsonb_build_object('status', 'success', 'message', 'Recipe cleared');
END;
$$;


ALTER FUNCTION "public"."delete_product_recipe"("p_product_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_raw_material"("p_material_id" "uuid", "p_organization_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Check delete permission
    IF NOT public.can_user_delete(p_organization_id) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Access Denied: Insufficient permissions');
    END IF;
    
    -- Verify material belongs to org
    PERFORM 1 FROM raw_materials WHERE id = p_material_id AND organization_id = p_organization_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Material not found');
    END IF;
    
    -- Soft delete
    UPDATE raw_materials SET is_active = false WHERE id = p_material_id;
    
    RETURN jsonb_build_object('status', 'success', 'message', 'Material archived');
END;
$$;


ALTER FUNCTION "public"."delete_raw_material"("p_material_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_product_normalization"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Normalize Name: Uppercase and Trim
    IF NEW.name IS NOT NULL THEN
        NEW.name := UPPER(TRIM(NEW.name));
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_product_normalization"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_product_normalization"() IS 'Auto-capitalizes names to prevent case-sensitivity bugs.';



CREATE OR REPLACE FUNCTION "public"."get_expense_breakdown"() RETURNS TABLE("category" "text", "total_amount" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    expenses.category,
    SUM(expenses.amount) as total_amount
  FROM expenses
  WHERE date > (CURRENT_DATE - INTERVAL '1 year')
  GROUP BY expenses.category;
END;
$$;


ALTER FUNCTION "public"."get_expense_breakdown"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_expense_breakdown"("start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("category" "text", "total_amount" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT category, SUM(amount)
  FROM expenses
  WHERE date >= start_date::DATE AND date <= end_date::DATE
  GROUP BY category;
END;
$$;


ALTER FUNCTION "public"."get_expense_breakdown"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_sales"() RETURNS TABLE("month_name" "text", "total_revenue" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(created_at, 'Mon YYYY') as month_name,
    SUM(total_amount) as total_revenue
  FROM sales
  WHERE created_at > (CURRENT_DATE - INTERVAL '12 months')
  GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
  ORDER BY DATE_TRUNC('month', created_at);
END;
$$;


ALTER FUNCTION "public"."get_monthly_sales"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("month_name" "text", "total_revenue" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(created_at, 'Mon YYYY') as month_name,
    SUM(total_amount) as total_revenue
  FROM sales
  WHERE created_at >= start_date AND created_at <= end_date
  GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
  ORDER BY DATE_TRUNC('month', created_at);
END;
$$;


ALTER FUNCTION "public"."get_monthly_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_performance"() RETURNS TABLE("product_name" "text", "total_revenue" numeric, "sale_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.name as product_name,
    SUM(s.total_amount) as total_revenue,
    COUNT(*) as sale_count
  FROM sales s
  JOIN finished_products fp ON s.finished_product_id = fp.id
  WHERE s.created_at > (CURRENT_DATE - INTERVAL '3 months')
  GROUP BY fp.name
  ORDER BY total_revenue DESC;
END;
$$;


ALTER FUNCTION "public"."get_product_performance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_recipe"("p_product_id" "uuid") RETURNS TABLE("raw_material_id" "uuid", "material_name" "text", "qty_required" numeric, "material_cost" numeric, "unit" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.raw_material_id,
        rm.name as material_name,
        r.qty_required, 
        rm.average_cost as material_cost,
        rm.unit
    FROM recipes r
    JOIN raw_materials rm ON r.raw_material_id = rm.id
    WHERE r.finished_product_id = p_product_id;
END;
$$;


ALTER FUNCTION "public"."get_product_recipe"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_recipe"("p_product_id" "uuid", "p_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("raw_material_id" "uuid", "material_name" "text", "qty_required" numeric, "material_cost" numeric, "unit" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.raw_material_id,
        rm.name as material_name,
        r.qty_required, 
        rm.average_cost as material_cost,
        rm.unit
    FROM recipes r
    JOIN raw_materials rm ON r.raw_material_id = rm.id
    WHERE r.finished_product_id = p_product_id
    AND (p_organization_id IS NULL OR r.organization_id = p_organization_id);
END;
$$;


ALTER FUNCTION "public"."get_product_recipe"("p_product_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quarterly_sales"() RETURNS TABLE("quarter_name" "text", "total_revenue" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Q' || EXTRACT(QUARTER FROM created_at) || ' ' || TO_CHAR(created_at, 'YYYY') as quarter_name,
    SUM(total_amount) as total_revenue
  FROM sales
  WHERE created_at > (CURRENT_DATE - INTERVAL '1 year')
  GROUP BY 'Q' || EXTRACT(QUARTER FROM created_at) || ' ' || TO_CHAR(created_at, 'YYYY'), DATE_TRUNC('quarter', created_at)
  ORDER BY DATE_TRUNC('quarter', created_at);
END;
$$;


ALTER FUNCTION "public"."get_quarterly_sales"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quarterly_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("quarter_name" "text", "total_revenue" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Q' || EXTRACT(QUARTER FROM created_at) || ' ' || TO_CHAR(created_at, 'YYYY') as quarter_name,
    SUM(total_amount) as total_revenue
  FROM sales
  WHERE created_at >= start_date AND created_at <= end_date
  GROUP BY 'Q' || EXTRACT(QUARTER FROM created_at) || ' ' || TO_CHAR(created_at, 'YYYY'), DATE_TRUNC('quarter', created_at)
  ORDER BY DATE_TRUNC('quarter', created_at);
END;
$$;


ALTER FUNCTION "public"."get_quarterly_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sales_by_dow"() RETURNS TABLE("day_name" "text", "total_revenue" numeric, "sale_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(created_at, 'Day') as day_name,
    SUM(total_amount) as total_revenue,
    COUNT(*) as sale_count
  FROM sales
  WHERE created_at > (CURRENT_DATE - INTERVAL '3 months') -- Last 3 months trend
  GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
  ORDER BY EXTRACT(DOW FROM created_at);
END;
$$;


ALTER FUNCTION "public"."get_sales_by_dow"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sales_by_dow"("start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("day_name" "text", "total_revenue" numeric, "sale_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(created_at, 'Day') as day_name,
    SUM(total_amount) as total_revenue,
    COUNT(*) as sale_count
  FROM sales
  WHERE created_at >= start_date AND created_at <= end_date
  GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
  ORDER BY EXTRACT(DOW FROM created_at);
END;
$$;


ALTER FUNCTION "public"."get_sales_by_dow"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sales_by_hour"() RETURNS TABLE("hour_of_day" integer, "sale_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM created_at)::INT as hour_of_day,
    COUNT(*) as sale_count
  FROM sales
  GROUP BY 1
  ORDER BY 1;
END;
$$;


ALTER FUNCTION "public"."get_sales_by_hour"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sales_by_hour"("start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("hour_of_day" integer, "sale_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM created_at)::INT as hour_of_day,
    COUNT(*) as sale_count
  FROM sales
  WHERE created_at >= start_date AND created_at <= end_date
  GROUP BY 1
  ORDER BY 1;
END;
$$;


ALTER FUNCTION "public"."get_sales_by_hour"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_products"() RETURNS TABLE("product_name" "text", "total_revenue" numeric, "sale_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.name as product_name,
    SUM(s.total_amount) as total_revenue,
    COUNT(*) as sale_count
  FROM sales s
  JOIN finished_products fp ON s.finished_product_id = fp.id
  WHERE s.created_at > (CURRENT_DATE - INTERVAL '3 months')
  GROUP BY fp.name
  ORDER BY total_revenue DESC
  LIMIT 5;
END;
$$;


ALTER FUNCTION "public"."get_top_products"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM platform_admins 
        WHERE email = auth.email()
    );
$$;


ALTER FUNCTION "public"."is_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_new_material"("p_name" "text", "p_unit" "text", "p_qty" numeric, "p_total_price" numeric, "p_emoji" "text", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_unit_cost NUMERIC;
BEGIN
    -- Safe Division
    v_unit_cost := CASE WHEN p_qty = 0 THEN 0 ELSE p_total_price / p_qty END;

    -- UPSERT Raw Material
    INSERT INTO raw_materials (name, unit, current_stock, average_cost, emoji, is_active)
    VALUES (p_name, p_unit, p_qty, v_unit_cost, p_emoji, true)
    ON CONFLICT (name) DO UPDATE 
    SET 
        average_cost = CASE 
            WHEN (raw_materials.current_stock + EXCLUDED.current_stock) = 0 THEN 0
            ELSE ((raw_materials.current_stock * raw_materials.average_cost) + p_total_price) 
                 / (raw_materials.current_stock + EXCLUDED.current_stock)
        END,
        current_stock = raw_materials.current_stock + EXCLUDED.current_stock,
        unit = EXCLUDED.unit,
        emoji = EXCLUDED.emoji,
        is_active = true;

    -- Log Expense
    INSERT INTO expenses (category, amount, description, created_by)
    VALUES (
        'Raw Materials',
        p_total_price,
        'Purchase: ' || p_name || ' (' || p_qty || ' ' || p_unit || ')',
        p_user_id
    );
END;
$$;


ALTER FUNCTION "public"."purchase_new_material"("p_name" "text", "p_unit" "text", "p_qty" numeric, "p_total_price" numeric, "p_emoji" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_new_material"("p_name" "text", "p_unit" "text", "p_qty" numeric, "p_total_price" numeric, "p_emoji" "text", "p_user_id" "uuid", "p_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_unit_cost NUMERIC;
    v_org_id UUID;
BEGIN
    -- 1. Determine Organization ID
    IF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSE
        SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
    END IF;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'No Organization ID found for Purchase';
    END IF;

    -- Safe Division
    v_unit_cost := CASE WHEN p_qty = 0 THEN 0 ELSE p_total_price / p_qty END;

    -- UPSERT Raw Material (Scoped to Org)
    INSERT INTO raw_materials (name, unit, current_stock, average_cost, emoji, is_active, organization_id)
    VALUES (p_name, p_unit, p_qty, v_unit_cost, p_emoji, true, v_org_id)
    ON CONFLICT (organization_id, name) DO UPDATE 
    SET 
        average_cost = CASE 
            WHEN (raw_materials.current_stock + EXCLUDED.current_stock) = 0 THEN 0
            ELSE ((raw_materials.current_stock * raw_materials.average_cost) + p_total_price) 
                 / (raw_materials.current_stock + EXCLUDED.current_stock)
        END,
        current_stock = raw_materials.current_stock + EXCLUDED.current_stock,
        unit = EXCLUDED.unit,
        emoji = EXCLUDED.emoji,
        is_active = true;

    -- Log Expense
    INSERT INTO expenses (category, amount, description, created_by, organization_id)
    VALUES (
        'Raw Materials',
        p_total_price,
        'Purchase: ' || p_name || ' (' || p_qty || ' ' || p_unit || ')',
        p_user_id,
        v_org_id
    );
END;
$$;


ALTER FUNCTION "public"."purchase_new_material"("p_name" "text", "p_unit" "text", "p_qty" numeric, "p_total_price" numeric, "p_emoji" "text", "p_user_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_experimental_batch"("p_product_id" "uuid", "p_qty_produced" integer, "p_ingredients" "jsonb", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  item JSONB;
  v_current_stock FLOAT;
  v_avg_cost DECIMAL;
  v_total_cost DECIMAL := 0;
  v_batch_id UUID;        -- <--- To link ingredients to this batch
BEGIN
  -- STEP A: Calculate Costs & Deduct Stock
  FOR item IN SELECT * FROM jsonb_array_elements(p_ingredients) LOOP
    
    -- Get current info
    SELECT current_stock, average_cost INTO v_current_stock, v_avg_cost
    FROM raw_materials WHERE id = (item->>'id')::UUID;

    -- Guard: Stop if not enough stock
    IF v_current_stock < (item->>'qty_used')::FLOAT THEN
      RAISE EXCEPTION 'Not enough ingredients in the pantry!';
    END IF;

    -- Deduct the stock
    UPDATE raw_materials 
    SET current_stock = current_stock - (item->>'qty_used')::FLOAT
    WHERE id = (item->>'id')::UUID;

    -- Add to running cost
    v_total_cost := v_total_cost + ((item->>'qty_used')::FLOAT * v_avg_cost);
  END LOOP;

  -- STEP B: Create the Batch Record (Now with User ID!)
  INSERT INTO production_batches (finished_product_id, quantity_produced, total_batch_cost, created_by)
  VALUES (p_product_id, p_qty_produced, v_total_cost, p_user_id)
  RETURNING id INTO v_batch_id; -- Capture the ID we just created

  -- STEP C: Create Audit Trail (For Smart Delete)
  -- We loop again to link the ingredients to this specific batch ID
  FOR item IN SELECT * FROM jsonb_array_elements(p_ingredients) LOOP
    INSERT INTO batch_ingredients (production_batch_id, raw_material_id, qty_used)
    VALUES (v_batch_id, (item->>'id')::UUID, (item->>'qty_used')::FLOAT);
  END LOOP;

  -- STEP D: Update Finished Product Stock
  UPDATE finished_products
  SET current_stock = current_stock + p_qty_produced
  WHERE id = p_product_id;
END;
$$;


ALTER FUNCTION "public"."record_experimental_batch"("p_product_id" "uuid", "p_qty_produced" integer, "p_ingredients" "jsonb", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_experimental_batch"("p_product_id" "uuid", "p_qty_produced" integer, "p_ingredients" "jsonb", "p_user_id" "uuid", "p_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    item JSONB;
    v_current_stock FLOAT;
    v_avg_cost DECIMAL;
    v_total_cost DECIMAL := 0;
    v_batch_id UUID;
    v_org_id UUID;
BEGIN
    -- 1. Determine Organization ID
    IF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSE
        SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
    END IF;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization ID could not be determined for Batch';
    END IF;

    -- 2. Validate Product Ownership
    PERFORM 1 FROM finished_products WHERE id = p_product_id AND organization_id = v_org_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found in this organization'; END IF;

    -- 3. Calculate Costs & Deduct Stock
    FOR item IN SELECT * FROM jsonb_array_elements(p_ingredients) LOOP
        
        SELECT current_stock, average_cost INTO v_current_stock, v_avg_cost
        FROM raw_materials 
        WHERE id = (item->>'id')::UUID AND organization_id = v_org_id; 

        IF v_current_stock < (item->>'qty_used')::FLOAT THEN
            RAISE EXCEPTION 'Not enough ingredients in the pantry!';
        END IF;

        UPDATE raw_materials 
        SET current_stock = current_stock - (item->>'qty_used')::FLOAT
        WHERE id = (item->>'id')::UUID;

        v_total_cost := v_total_cost + ((item->>'qty_used')::FLOAT * v_avg_cost);
    END LOOP;

    -- 4. Create Batch Record (NO EXPENSE INSERTION)
    INSERT INTO production_batches (organization_id, finished_product_id, quantity_produced, total_batch_cost, created_by)
    VALUES (v_org_id, p_product_id, p_qty_produced, v_total_cost, p_user_id)
    RETURNING id INTO v_batch_id;

    -- 5. Audit Trail
    FOR item IN SELECT * FROM jsonb_array_elements(p_ingredients) LOOP
        INSERT INTO batch_ingredients (organization_id, production_batch_id, raw_material_id, qty_used)
        VALUES (v_org_id, v_batch_id, (item->>'id')::UUID, (item->>'qty_used')::FLOAT);
    END LOOP;

    -- 6. Update Finished Product Stock
    UPDATE finished_products
    SET current_stock = current_stock + p_qty_produced
    WHERE id = p_product_id;

    RETURN v_batch_id;
END;
$$;


ALTER FUNCTION "public"."record_experimental_batch"("p_product_id" "uuid", "p_qty_produced" integer, "p_ingredients" "jsonb", "p_user_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_manual_sale"("p_product_id" "uuid", "p_qty" numeric, "p_payment_method" "text", "p_user_id" "uuid", "p_organization_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_current_stock numeric;
    v_sale_price numeric;
    v_total numeric;
    v_product_name text;
BEGIN
    -- Get product info
    SELECT current_stock, sale_price, name 
    INTO v_current_stock, v_sale_price, v_product_name
    FROM finished_products
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    -- Check stock (allow small epsilon for float errors if needed, but exact check is fine for numeric)
    IF v_current_stock < p_qty THEN
        RAISE EXCEPTION 'Not enough stock. Available: %', v_current_stock;
    END IF;

    -- Deduct stock
    UPDATE finished_products
    SET current_stock = current_stock - p_qty
    WHERE id = p_product_id;

    -- Calculate total
    v_total := p_qty * v_sale_price;

    -- Insert sale
    INSERT INTO sales (finished_product_id, quantity, total_amount, status, created_by, organization_id)
    VALUES (p_product_id, p_qty, v_total, 'paid', p_user_id, p_organization_id);

    RETURN jsonb_build_object('success', true, 'new_stock', v_current_stock - p_qty);
END;
$$;


ALTER FUNCTION "public"."record_manual_sale"("p_product_id" "uuid", "p_qty" numeric, "p_payment_method" "text", "p_user_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_org_member"("p_member_user_id" "uuid", "p_organization_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_caller_role text;
    v_target_role text;
BEGIN
    -- Get caller's role (Profile Check)
    SELECT role INTO v_caller_role FROM profiles 
    WHERE organization_id = p_organization_id AND id = auth.uid();
    
    IF v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Permission denied');
    END IF;

    -- Get target's current role
    SELECT role INTO v_target_role FROM profiles 
    WHERE organization_id = p_organization_id AND id = p_member_user_id;

    -- Owners can only be removed by platform admins (not handled here) or themselves? 
    -- Logic: Owner cannot remove Owner.
    IF v_target_role = 'owner' THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Org owners cannot be removed via this function');
    END IF;

    -- Cannot remove yourself (UI should handle this, but safety check)
    IF p_member_user_id = auth.uid() THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Cannot remove yourself');
    END IF;

    -- Remove from org = Set Profile Org to NULL
    UPDATE profiles 
    SET organization_id = NULL, role = 'staff', tags = '{}' -- Reset role/tags
    WHERE id = p_member_user_id AND organization_id = p_organization_id;

    RETURN jsonb_build_object('status', 'success', 'message', 'Member removed from organization');
END;
$$;


ALTER FUNCTION "public"."remove_org_member"("p_member_user_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."smart_delete_item"("target_id" "uuid", "table_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_usage_count INT;
    v_sales_count INT;
    v_batch_count INT;
BEGIN
    IF table_name = 'raw' THEN
        -- Check if ingredient has ever been used
        SELECT count(*) INTO v_usage_count 
        FROM batch_ingredients 
        WHERE raw_material_id = target_id;

        IF v_usage_count = 0 THEN
            DELETE FROM raw_materials WHERE id = target_id;
            RETURN 'PERMANENTLY_DELETED';
        ELSE
            UPDATE raw_materials SET is_active = false WHERE id = target_id;
            RETURN 'ARCHIVED';
        END IF;

    ELSIF table_name = 'product' THEN
        -- Check sales history
        SELECT count(*) INTO v_sales_count FROM sales WHERE finished_product_id = target_id;
        -- Check production history
        SELECT count(*) INTO v_batch_count FROM production_batches WHERE finished_product_id = target_id;

        IF v_sales_count = 0 AND v_batch_count = 0 THEN
            DELETE FROM finished_products WHERE id = target_id;
            RETURN 'PERMANENTLY_DELETED';
        ELSE
            UPDATE finished_products SET is_active = false WHERE id = target_id;
            RETURN 'ARCHIVED';
        END IF;
    
    ELSE
        RAISE EXCEPTION 'Invalid table name';
    END IF;
END;
$$;


ALTER FUNCTION "public"."smart_delete_item"("target_id" "uuid", "table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_simple_stock_to_products"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    is_simple_stock BOOLEAN;
BEGIN
    SELECT module_production = FALSE INTO is_simple_stock
    FROM public.organization_settings 
    WHERE organization_id = NEW.organization_id;
    
    IF is_simple_stock THEN
        INSERT INTO public.finished_products (
            organization_id, name, sale_price, current_stock, unit, is_active
        )
        VALUES (
            NEW.organization_id, 
            UPPER(NEW.name),
            COALESCE(NEW.average_cost * 1.3, 0),
            NEW.current_stock, 
            NEW.unit,         
            COALESCE(NEW.is_active, true)
        )
        ON CONFLICT (organization_id, name) 
        DO UPDATE SET
            current_stock = EXCLUDED.current_stock,
            unit = EXCLUDED.unit,
            sale_price = CASE 
                WHEN finished_products.sale_price = 0 OR finished_products.sale_price IS NULL 
                THEN EXCLUDED.sale_price 
                ELSE finished_products.sale_price 
            END,
            is_active = EXCLUDED.is_active;
            
        RAISE NOTICE 'Synced % to finished_products (Stock: %, Unit: %) for org %', 
            NEW.name, NEW.current_stock, NEW.unit, NEW.organization_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_simple_stock_to_products"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_simple_stock_to_products"() IS 'v2 (Fixed): Supports fractional stock and syncs unit column. 
Auto-syncs raw_materials to finished_products for Retail companies.';



CREATE OR REPLACE FUNCTION "public"."update_org_member_phone"("p_member_user_id" "uuid", "p_phone" "text", "p_organization_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_caller_role text;
BEGIN
    -- Get caller's role
    SELECT role INTO v_caller_role FROM profiles 
    WHERE organization_id = p_organization_id AND id = auth.uid();
    
    IF v_caller_role NOT IN ('owner', 'admin') AND auth.uid() != p_member_user_id THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Permission denied');
    END IF;

    -- Update phone in profiles
    UPDATE profiles 
    SET phone = p_phone 
    WHERE id = p_member_user_id AND organization_id = p_organization_id;

    RETURN jsonb_build_object('status', 'success');
END;
$$;


ALTER FUNCTION "public"."update_org_member_phone"("p_member_user_id" "uuid", "p_phone" "text", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_org_member_role"("p_member_user_id" "uuid", "p_new_role" "text", "p_organization_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_caller_role text;
    v_target_role text;
BEGIN
    -- Get caller's role
    SELECT role INTO v_caller_role FROM profiles 
    WHERE organization_id = p_organization_id AND id = auth.uid();
    
    IF v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Permission denied');
    END IF;

    -- Get target's current role
    SELECT role INTO v_target_role FROM profiles 
    WHERE organization_id = p_organization_id AND id = p_member_user_id;

    IF v_target_role = 'owner' THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Cannot modify org owner');
    END IF;

    IF p_new_role = 'owner' THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Cannot promote to owner');
    END IF;

    -- Update role in Profile
    UPDATE profiles 
    SET role = p_new_role 
    WHERE organization_id = p_organization_id AND id = p_member_user_id;

    RETURN jsonb_build_object('status', 'success');
END;
$$;


ALTER FUNCTION "public"."update_org_member_role"("p_member_user_id" "uuid", "p_new_role" "text", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_organization_settings"("p_organization_id" "uuid", "p_theme_primary_color" "text" DEFAULT NULL::"text", "p_theme_background" "text" DEFAULT NULL::"text", "p_theme_foreground" "text" DEFAULT NULL::"text", "p_theme_accent" "text" DEFAULT NULL::"text", "p_theme_mode" "text" DEFAULT NULL::"text", "p_logo_url" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Check if user is admin of this org (Profile Check)
    PERFORM 1 FROM profiles 
    WHERE organization_id = p_organization_id 
    AND id = auth.uid() 
    AND role IN ('owner', 'admin');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Access Denied');
    END IF;
    
    -- Update only non-null values
    UPDATE organization_settings
    SET 
        theme_primary_color = COALESCE(p_theme_primary_color, theme_primary_color),
        theme_background = COALESCE(p_theme_background, theme_background),
        theme_foreground = COALESCE(p_theme_foreground, theme_foreground),
        theme_accent = COALESCE(p_theme_accent, theme_accent),
        theme_mode = COALESCE(p_theme_mode, theme_mode),
        logo_url = COALESCE(p_logo_url, logo_url)
    WHERE organization_id = p_organization_id;
    
    RETURN jsonb_build_object('status', 'success');
END;
$$;


ALTER FUNCTION "public"."update_organization_settings"("p_organization_id" "uuid", "p_theme_primary_color" "text", "p_theme_background" "text", "p_theme_foreground" "text", "p_theme_accent" "text", "p_theme_mode" "text", "p_logo_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product_recipe"("p_product_id" "uuid", "p_ingredients" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    item JSONB;
BEGIN
    -- 1. Clear existing recipe for this product
    DELETE FROM recipes WHERE finished_product_id = p_product_id;

    -- 2. Insert new ingredients
    FOR item IN SELECT * FROM jsonb_array_elements(p_ingredients)
    LOOP
        INSERT INTO recipes (finished_product_id, raw_material_id, qty_required, created_by)
        VALUES (
            p_product_id,
            (item->>'raw_material_id')::UUID,
            (item->>'qty_required')::DECIMAL,
            auth.uid()
        );
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."update_product_recipe"("p_product_id" "uuid", "p_ingredients" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product_recipe"("p_product_id" "uuid", "p_ingredients" "jsonb", "p_organization_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    item JSONB;
BEGIN
    -- Security Check 1: Verify product belongs to organization
    PERFORM 1 FROM finished_products WHERE id = p_product_id AND organization_id = p_organization_id;
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'Access Denied: Product not in organization'; 
    END IF;
    
    -- Security Check 2: Verify user is member of this organization (Profile Check)
    PERFORM 1 FROM profiles WHERE organization_id = p_organization_id AND id = auth.uid();
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'Access Denied: User not in organization'; 
    END IF;

    -- 1. Clear existing recipes for this product
    DELETE FROM recipes WHERE finished_product_id = p_product_id AND organization_id = p_organization_id;

    -- 2. Insert new ingredients
    FOR item IN SELECT * FROM jsonb_array_elements(p_ingredients)
    LOOP
        INSERT INTO recipes (organization_id, finished_product_id, raw_material_id, qty_required, created_by)
        VALUES (
            p_organization_id,
            p_product_id,
            (item->>'raw_material_id')::UUID,
            (item->>'qty_required')::DECIMAL,
            auth.uid()
        );
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."update_product_recipe"("p_product_id" "uuid", "p_ingredients" "jsonb", "p_organization_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."batch_ingredients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "production_batch_id" "uuid",
    "raw_material_id" "uuid",
    "qty_used" numeric(15,4) NOT NULL,
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."batch_ingredients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "sender" "text" NOT NULL,
    "message_body" "text" NOT NULL,
    "intent_detected" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "phone" "text" NOT NULL,
    "name" "text",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "description" "text",
    "date" "date" DEFAULT CURRENT_DATE,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "finished_product_id" "uuid",
    "quantity" numeric NOT NULL,
    "total_amount" numeric NOT NULL,
    "customer_phone" "text",
    "status" "public"."sale_status" DEFAULT 'pending'::"public"."sale_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "organization_id" "uuid" NOT NULL,
    "shipping_address" "text"
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dashboard_financials" WITH ("security_invoker"='true') AS
 SELECT ("date_trunc"('month'::"text", "sales"."created_at"))::"date" AS "month",
    'revenue'::"text" AS "type",
    "sum"("sales"."total_amount") AS "amount",
    "sales"."organization_id"
   FROM "public"."sales"
  GROUP BY (("date_trunc"('month'::"text", "sales"."created_at"))::"date"), "sales"."organization_id"
UNION ALL
 SELECT ("date_trunc"('month'::"text", ("expenses"."date")::timestamp with time zone))::"date" AS "month",
    'opex'::"text" AS "type",
    "sum"("expenses"."amount") AS "amount",
    "expenses"."organization_id"
   FROM "public"."expenses"
  GROUP BY (("date_trunc"('month'::"text", ("expenses"."date")::timestamp with time zone))::"date"), "expenses"."organization_id";


ALTER VIEW "public"."dashboard_financials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."finished_products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "sale_price" numeric NOT NULL,
    "current_stock" numeric DEFAULT 0,
    "is_public" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "organization_id" "uuid" NOT NULL,
    "unit" "text" DEFAULT 'pz'::"text",
    "package_weight" numeric,
    "weight_unit" "text"
);


ALTER TABLE "public"."finished_products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."finished_products"."package_weight" IS 'Peso neto del paquete (ej: 540 para 540g) para conversiones de venta a granel';



COMMENT ON COLUMN "public"."finished_products"."weight_unit" IS 'Unidad del peso del paquete (g, kg, ml, lt)';



CREATE TABLE IF NOT EXISTS "public"."invites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" "text" NOT NULL,
    "created_by" "uuid",
    "used_by" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "role_to_assign" "public"."invite_role" DEFAULT 'staff'::"public"."invite_role",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "role" "public"."invite_role" DEFAULT 'staff'::"public"."invite_role",
    "organization_id" "uuid"
);

ALTER TABLE ONLY "public"."invites" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_channels" (
    "organization_id" "uuid" NOT NULL,
    "platform" "text" DEFAULT 'whatsapp'::"text" NOT NULL,
    "phone_number_id" "text" NOT NULL,
    "api_key_ref" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_channels" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_channels" IS 'Single Source of Truth for Meta WhatsApp Business API channel routing. 
phone_number_id maps to Meta Cloud API phone number ID.';



CREATE TABLE IF NOT EXISTS "public"."organization_settings" (
    "organization_id" "uuid" NOT NULL,
    "module_inventory" boolean DEFAULT true,
    "module_production" boolean DEFAULT true,
    "module_recipes" boolean DEFAULT true,
    "module_team" boolean DEFAULT false,
    "theme_primary_color" "text" DEFAULT '#f97316'::"text",
    "theme_radius" "text" DEFAULT '0.5rem'::"text",
    "logo_url" "text",
    "business_description" "text",
    "terminology" "jsonb" DEFAULT '{"pantry": "Pantry", "kitchen": "Kitchen", "recipes": "Recipes", "production": "Production"}'::"jsonb",
    "theme_mode" "text" DEFAULT 'dark'::"text",
    "theme_background" "text" DEFAULT '#0c0a09'::"text",
    "theme_foreground" "text" DEFAULT '#fafaf9'::"text",
    "theme_accent" "text",
    "theme_preset" "text" DEFAULT 'midnight'::"text"
);


ALTER TABLE "public"."organization_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."production_batches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "finished_product_id" "uuid",
    "quantity_produced" integer NOT NULL,
    "total_batch_cost" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."production_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'staff'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_admin" boolean DEFAULT false,
    "phone" "text",
    "organization_id" "uuid",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "telegram_id" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."telegram_id" IS 'Telegram chat_id for bot integration. Set via self-service linking flow using profile ID + phone for security.';



CREATE TABLE IF NOT EXISTS "public"."raw_materials" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "current_stock" numeric(15,4) DEFAULT 0,
    "average_cost" numeric(15,2) DEFAULT 0,
    "emoji" "text",
    "is_active" boolean DEFAULT true,
    "organization_id" "uuid" NOT NULL,
    "package_weight" numeric,
    "weight_unit" "text",
    CONSTRAINT "raw_materials_weight_unit_check" CHECK (("weight_unit" = ANY (ARRAY['g'::"text", 'kg'::"text", 'ml'::"text", 'lt'::"text", NULL::"text"])))
);


ALTER TABLE "public"."raw_materials" OWNER TO "postgres";


COMMENT ON COLUMN "public"."raw_materials"."package_weight" IS 'Weight per package/unit (e.g., 540 for a 540g bread bag)';



COMMENT ON COLUMN "public"."raw_materials"."weight_unit" IS 'Unit of the package weight (g, kg, ml, lt)';



CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "finished_product_id" "uuid",
    "raw_material_id" "uuid",
    "qty_required" numeric(15,4) NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."recipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_posts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "author_id" "uuid",
    "content" "text" NOT NULL,
    "type" "public"."post_type" DEFAULT 'general'::"public"."post_type",
    "is_resolved" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."team_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"(),
    "payload" "jsonb"
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


ALTER TABLE ONLY "public"."batch_ingredients"
    ADD CONSTRAINT "batch_ingredients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_conversations"
    ADD CONSTRAINT "crm_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_customers"
    ADD CONSTRAINT "crm_customers_organization_id_phone_key" UNIQUE ("organization_id", "phone");



ALTER TABLE ONLY "public"."crm_customers"
    ADD CONSTRAINT "crm_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finished_products"
    ADD CONSTRAINT "finished_products_org_name_unique" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."finished_products"
    ADD CONSTRAINT "finished_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_channels"
    ADD CONSTRAINT "organization_channels_phone_number_id_key" UNIQUE ("phone_number_id");



ALTER TABLE ONLY "public"."organization_channels"
    ADD CONSTRAINT "organization_channels_pkey" PRIMARY KEY ("organization_id", "platform");



ALTER TABLE ONLY "public"."organization_settings"
    ADD CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("organization_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raw_materials"
    ADD CONSTRAINT "raw_materials_org_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."raw_materials"
    ADD CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_finished_product_id_raw_material_id_key" UNIQUE ("finished_product_id", "raw_material_id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_posts"
    ADD CONSTRAINT "team_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_expenses_date" ON "public"."expenses" USING "btree" ("date");



CREATE INDEX "idx_production_batches_created_at" ON "public"."production_batches" USING "btree" ("created_at");



CREATE UNIQUE INDEX "idx_profiles_telegram_id" ON "public"."profiles" USING "btree" ("telegram_id") WHERE ("telegram_id" IS NOT NULL);



CREATE INDEX "idx_recipes_product_material" ON "public"."recipes" USING "btree" ("finished_product_id", "raw_material_id");



CREATE INDEX "idx_sales_created_at" ON "public"."sales" USING "btree" ("created_at");



CREATE OR REPLACE TRIGGER "sync_retail_inventory" AFTER INSERT OR UPDATE ON "public"."raw_materials" FOR EACH ROW EXECUTE FUNCTION "public"."sync_simple_stock_to_products"();



CREATE OR REPLACE TRIGGER "trg_normalize_finished_products" BEFORE INSERT OR UPDATE ON "public"."finished_products" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_product_normalization"();



CREATE OR REPLACE TRIGGER "trg_normalize_raw_materials" BEFORE INSERT OR UPDATE ON "public"."raw_materials" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_product_normalization"();



CREATE OR REPLACE TRIGGER "trigger_sync_simple_stock" AFTER INSERT OR UPDATE ON "public"."raw_materials" FOR EACH ROW EXECUTE FUNCTION "public"."sync_simple_stock_to_products"();



ALTER TABLE ONLY "public"."batch_ingredients"
    ADD CONSTRAINT "batch_ingredients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_ingredients"
    ADD CONSTRAINT "batch_ingredients_production_batch_id_fkey" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_ingredients"
    ADD CONSTRAINT "batch_ingredients_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id");



ALTER TABLE ONLY "public"."crm_conversations"
    ADD CONSTRAINT "crm_conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_customers"
    ADD CONSTRAINT "crm_customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."finished_products"
    ADD CONSTRAINT "finished_products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "fk_invites_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "fk_invites_used_by" FOREIGN KEY ("used_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_channels"
    ADD CONSTRAINT "organization_channels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_settings"
    ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_finished_product_id_fkey" FOREIGN KEY ("finished_product_id") REFERENCES "public"."finished_products"("id");



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."raw_materials"
    ADD CONSTRAINT "raw_materials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_finished_product_id_fkey" FOREIGN KEY ("finished_product_id") REFERENCES "public"."finished_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_finished_product_id_fkey" FOREIGN KEY ("finished_product_id") REFERENCES "public"."finished_products"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_posts"
    ADD CONSTRAINT "team_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."team_posts"
    ADD CONSTRAINT "team_posts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can create invites" ON "public"."invites" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view all invites" ON "public"."invites" FOR SELECT USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "Anyone can check invites" ON "public"."invites" FOR SELECT USING (true);



CREATE POLICY "Anyone can view invites to validate codes" ON "public"."invites" FOR SELECT USING (true);



CREATE POLICY "Enable read access for own organization settings" ON "public"."organization_settings" USING (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Invites can be updated by authenticated users" ON "public"."invites" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Invites created by org members" ON "public"."invites" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "created_by") AND ("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Platform admins only" ON "public"."platform_admins" USING (("auth"."email"() IN ( SELECT "platform_admins_1"."email"
   FROM "public"."platform_admins" "platform_admins_1")));



CREATE POLICY "Public can validate active invites" ON "public"."invites" FOR SELECT USING (("status" = 'active'::"text"));



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Service Role Full Access" ON "public"."webhook_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service Role can insert logs" ON "public"."crm_conversations" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "System can mark invites as used" ON "public"."invites" FOR UPDATE USING (true);



CREATE POLICY "Tenant Delete Access for Team Posts" ON "public"."team_posts" FOR DELETE USING ((("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (("author_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))))));



CREATE POLICY "Tenant Isolation for Batches" ON "public"."production_batches" USING (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation for Expenses" ON "public"."expenses" USING (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation for Products" ON "public"."finished_products" USING (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation for Raw Materials" ON "public"."raw_materials" USING (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation for Recipes" ON "public"."recipes" USING (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation for Sales" ON "public"."sales" USING (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation for Team Posts" ON "public"."team_posts" USING (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Update Access for Team Posts" ON "public"."team_posts" FOR UPDATE USING (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Write Access for Batch Ingredients" ON "public"."batch_ingredients" USING ("public"."check_user_org_access"("organization_id"));



CREATE POLICY "Tenant Write Access for Batches" ON "public"."production_batches" USING ("public"."check_user_org_access"("organization_id"));



CREATE POLICY "Tenant Write Access for Expenses" ON "public"."expenses" FOR INSERT WITH CHECK (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Write Access for Products" ON "public"."finished_products" USING ("public"."check_user_org_access"("organization_id"));



CREATE POLICY "Tenant Write Access for Raw Materials" ON "public"."raw_materials" USING ("public"."check_user_org_access"("organization_id"));



CREATE POLICY "Tenant Write Access for Recipes" ON "public"."recipes" USING ("public"."check_user_org_access"("organization_id"));



CREATE POLICY "Tenant Write Access for Sales" ON "public"."sales" FOR INSERT WITH CHECK (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Write Access for Team Posts" ON "public"."team_posts" FOR INSERT WITH CHECK (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their own posts" ON "public"."team_posts" FOR DELETE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own posts" ON "public"."team_posts" FOR UPDATE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "View Own Org Customers" ON "public"."crm_customers" USING (("organization_id" = ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."batch_ingredients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."finished_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."production_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."raw_materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "bot_sales_agent";

























































































































































GRANT ALL ON FUNCTION "public"."can_user_delete"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_delete"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_delete"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_org_access"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_org_access"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_org_access"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_product_with_recipe"("p_name" "text", "p_sale_price" numeric, "p_ingredients" "jsonb", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_product_with_recipe"("p_name" "text", "p_sale_price" numeric, "p_ingredients" "jsonb", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_product_with_recipe"("p_name" "text", "p_sale_price" numeric, "p_ingredients" "jsonb", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean, "p_theme_color" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean, "p_theme_color" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean, "p_theme_color" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_type" "text", "p_theme_color" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_type" "text", "p_theme_color" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_type" "text", "p_theme_color" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean, "p_theme_color" "text", "p_terminology" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean, "p_theme_color" "text", "p_terminology" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tenant"("p_name" "text", "p_slug" "text", "p_admin_email" "text", "p_admin_uid" "uuid", "p_is_crafting" boolean, "p_theme_color" "text", "p_terminology" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_finished_product"("p_product_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_finished_product"("p_product_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_finished_product"("p_product_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_product_recipe"("p_product_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_product_recipe"("p_product_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_product_recipe"("p_product_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_raw_material"("p_material_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_raw_material"("p_material_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_raw_material"("p_material_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_product_normalization"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_product_normalization"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_product_normalization"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_expense_breakdown"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_expense_breakdown"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_expense_breakdown"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_expense_breakdown"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_expense_breakdown"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_expense_breakdown"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_sales"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_sales"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_sales"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_performance"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_performance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_performance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_recipe"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_recipe"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_recipe"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_recipe"("p_product_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_recipe"("p_product_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_recipe"("p_product_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quarterly_sales"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_quarterly_sales"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quarterly_sales"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quarterly_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_quarterly_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quarterly_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sales_by_dow"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_sales_by_dow"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sales_by_dow"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sales_by_dow"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sales_by_dow"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sales_by_dow"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sales_by_hour"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_sales_by_hour"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sales_by_hour"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sales_by_hour"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sales_by_hour"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sales_by_hour"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_products"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_products"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_products"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_new_material"("p_name" "text", "p_unit" "text", "p_qty" numeric, "p_total_price" numeric, "p_emoji" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_new_material"("p_name" "text", "p_unit" "text", "p_qty" numeric, "p_total_price" numeric, "p_emoji" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_new_material"("p_name" "text", "p_unit" "text", "p_qty" numeric, "p_total_price" numeric, "p_emoji" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_new_material"("p_name" "text", "p_unit" "text", "p_qty" numeric, "p_total_price" numeric, "p_emoji" "text", "p_user_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_new_material"("p_name" "text", "p_unit" "text", "p_qty" numeric, "p_total_price" numeric, "p_emoji" "text", "p_user_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_new_material"("p_name" "text", "p_unit" "text", "p_qty" numeric, "p_total_price" numeric, "p_emoji" "text", "p_user_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_experimental_batch"("p_product_id" "uuid", "p_qty_produced" integer, "p_ingredients" "jsonb", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."record_experimental_batch"("p_product_id" "uuid", "p_qty_produced" integer, "p_ingredients" "jsonb", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_experimental_batch"("p_product_id" "uuid", "p_qty_produced" integer, "p_ingredients" "jsonb", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_experimental_batch"("p_product_id" "uuid", "p_qty_produced" integer, "p_ingredients" "jsonb", "p_user_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."record_experimental_batch"("p_product_id" "uuid", "p_qty_produced" integer, "p_ingredients" "jsonb", "p_user_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_experimental_batch"("p_product_id" "uuid", "p_qty_produced" integer, "p_ingredients" "jsonb", "p_user_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_manual_sale"("p_product_id" "uuid", "p_qty" numeric, "p_payment_method" "text", "p_user_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."record_manual_sale"("p_product_id" "uuid", "p_qty" numeric, "p_payment_method" "text", "p_user_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_manual_sale"("p_product_id" "uuid", "p_qty" numeric, "p_payment_method" "text", "p_user_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_org_member"("p_member_user_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_org_member"("p_member_user_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_org_member"("p_member_user_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."smart_delete_item"("target_id" "uuid", "table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."smart_delete_item"("target_id" "uuid", "table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."smart_delete_item"("target_id" "uuid", "table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_simple_stock_to_products"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_simple_stock_to_products"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_simple_stock_to_products"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_org_member_phone"("p_member_user_id" "uuid", "p_phone" "text", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_org_member_phone"("p_member_user_id" "uuid", "p_phone" "text", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_org_member_phone"("p_member_user_id" "uuid", "p_phone" "text", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_org_member_role"("p_member_user_id" "uuid", "p_new_role" "text", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_org_member_role"("p_member_user_id" "uuid", "p_new_role" "text", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_org_member_role"("p_member_user_id" "uuid", "p_new_role" "text", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organization_settings"("p_organization_id" "uuid", "p_theme_primary_color" "text", "p_theme_background" "text", "p_theme_foreground" "text", "p_theme_accent" "text", "p_theme_mode" "text", "p_logo_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_organization_settings"("p_organization_id" "uuid", "p_theme_primary_color" "text", "p_theme_background" "text", "p_theme_foreground" "text", "p_theme_accent" "text", "p_theme_mode" "text", "p_logo_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organization_settings"("p_organization_id" "uuid", "p_theme_primary_color" "text", "p_theme_background" "text", "p_theme_foreground" "text", "p_theme_accent" "text", "p_theme_mode" "text", "p_logo_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_product_recipe"("p_product_id" "uuid", "p_ingredients" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_product_recipe"("p_product_id" "uuid", "p_ingredients" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_product_recipe"("p_product_id" "uuid", "p_ingredients" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_product_recipe"("p_product_id" "uuid", "p_ingredients" "jsonb", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_product_recipe"("p_product_id" "uuid", "p_ingredients" "jsonb", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_product_recipe"("p_product_id" "uuid", "p_ingredients" "jsonb", "p_organization_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."batch_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."batch_ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."crm_conversations" TO "anon";
GRANT ALL ON TABLE "public"."crm_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."crm_customers" TO "anon";
GRANT ALL ON TABLE "public"."crm_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_customers" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";
GRANT INSERT ON TABLE "public"."sales" TO "bot_sales_agent";



GRANT ALL ON TABLE "public"."dashboard_financials" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_financials" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_financials" TO "service_role";



GRANT ALL ON TABLE "public"."finished_products" TO "anon";
GRANT ALL ON TABLE "public"."finished_products" TO "authenticated";
GRANT ALL ON TABLE "public"."finished_products" TO "service_role";



GRANT SELECT("name") ON TABLE "public"."finished_products" TO "bot_sales_agent";



GRANT SELECT("description") ON TABLE "public"."finished_products" TO "bot_sales_agent";



GRANT SELECT("sale_price") ON TABLE "public"."finished_products" TO "bot_sales_agent";



GRANT SELECT("current_stock") ON TABLE "public"."finished_products" TO "bot_sales_agent";



GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";



GRANT ALL ON TABLE "public"."organization_channels" TO "anon";
GRANT ALL ON TABLE "public"."organization_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_channels" TO "service_role";



GRANT ALL ON TABLE "public"."organization_settings" TO "anon";
GRANT ALL ON TABLE "public"."organization_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_settings" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."platform_admins" TO "anon";
GRANT ALL ON TABLE "public"."platform_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_admins" TO "service_role";



GRANT ALL ON TABLE "public"."production_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."production_batches" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."raw_materials" TO "anon";
GRANT ALL ON TABLE "public"."raw_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."raw_materials" TO "service_role";



GRANT ALL ON TABLE "public"."recipes" TO "anon";
GRANT ALL ON TABLE "public"."recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."recipes" TO "service_role";



GRANT ALL ON TABLE "public"."team_posts" TO "anon";
GRANT ALL ON TABLE "public"."team_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."team_posts" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































