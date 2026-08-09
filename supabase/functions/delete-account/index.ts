import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid authorization header." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables are not configured.");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const runDelete = async (table: string, column: string) => {
      const { error } = await adminClient.from(table).delete().eq(column, userId);
      if (error) {
        if (error.code === "42P01") {
          return;
        }
        throw new Error(`Failed deleting from ${table}: ${error.message}`);
      }
    };

    const { error: reviewedByError } = await adminClient
      .from("teacher_requests")
      .update({ reviewed_by: null })
      .eq("reviewed_by", userId);

    if (reviewedByError && reviewedByError.code !== "42P01") {
      throw new Error(`Failed updating teacher_requests.reviewed_by: ${reviewedByError.message}`);
    }

    await runDelete("post_comments", "user_id");
    await runDelete("live_session_participants", "student_id");
    await runDelete("classroom_memberships", "student_id");
    await runDelete("assignment_submissions", "student_id");
    await runDelete("test_review_requests", "student_id");

    await runDelete("student_progress_shares", "user_id");
    await runDelete("feedback", "user_id");
    await runDelete("writing_evaluations", "user_id");
    await runDelete("speaking_evaluations", "user_id");
    await runDelete("test_results", "user_id");
    await runDelete("premium_requests", "user_id");
    await runDelete("teacher_requests", "user_id");

    await runDelete("live_sessions", "teacher_id");
    await runDelete("classroom_posts", "teacher_id");
    await runDelete("assignments", "teacher_id");
    await runDelete("classrooms", "teacher_id");
    await runDelete("consultancies", "owner_id");

    await runDelete("user_roles", "user_id");
    await runDelete("profiles", "user_id");

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      throw new Error(`Failed deleting auth user: ${deleteAuthError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error deleting account.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
