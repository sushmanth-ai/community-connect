import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateSecurePassword(length = 14): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;
  
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  // Ensure at least one of each type
  const password = [
    upper[array[0] % upper.length],
    lower[array[1] % lower.length],
    digits[array[2] % digits.length],
    special[array[3] % special.length],
  ];
  
  for (let i = 4; i < length; i++) {
    password.push(all[array[i] % all.length]);
  }
  
  // Shuffle
  for (let i = password.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }
  
  return password.join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .limit(1)
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Only admins can create authority accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, email, phone, gov_id, mandal_id, department_id, active_status } = await req.json();

    // Validate inputs
    if (!name || !email || !mandal_id || !department_id) {
      return new Response(JSON.stringify({ error: "Name, email, mandal, and department are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate secure password
    const generatedPassword = generateSecurePassword(14);

    let userId: string;

    // Try to create new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u) => u.email === email);
        if (!existingUser) {
          return new Response(JSON.stringify({ error: "User exists but could not be found" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = existingUser.id;
        // Update password for existing user
        await supabaseAdmin.auth.admin.updateUserById(userId, { password: generatedPassword });
      } else {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userId = newUser.user.id;
    }

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        name,
        mobile_number: phone || null,
        department_id,
        mandal_id,
        gov_id: gov_id || null,
        first_login: true,
        active_status: active_status !== false,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Update user_role to authority with department
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (existingRole) {
      await supabaseAdmin
        .from("user_roles")
        .update({ role: "authority" as any, department_id })
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        generated_password: generatedPassword,
        email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Create authority error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
