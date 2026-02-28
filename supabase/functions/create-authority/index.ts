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
  
  const password = [
    upper[array[0] % upper.length],
    lower[array[1] % lower.length],
    digits[array[2] % digits.length],
    special[array[3] % special.length],
  ];
  
  for (let i = 4; i < length; i++) {
    password.push(all[array[i] % all.length]);
  }
  
  for (let i = password.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }
  
  return password.join("");
}

async function sendCredentialsEmail(
  to: string,
  authorityName: string,
  password: string,
  mandalName: string,
  deptName: string,
  loginUrl: string
): Promise<boolean> {
  const serviceId = Deno.env.get("EMAILJS_SERVICE_ID");
  const templateId = Deno.env.get("EMAILJS_TEMPLATE_ID");
  const publicKey = Deno.env.get("EMAILJS_PUBLIC_KEY");
  const privateKey = Deno.env.get("EMAILJS_PRIVATE_KEY");

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.error("EmailJS credentials not configured");
    return false;
  }

  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          to_email: to,
          authority_name: authorityName,
          password: password,
          mandal_name: mandalName,
          department_name: deptName,
          login_url: loginUrl,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("EmailJS API error:", err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Email send error:", e);
    return false;
  }
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

    const body = await req.json();

    // Handle resend email action
    if (body._action === "resend_email") {
      const { email: resendEmail, password: resendPassword, name: resendName, mandal_name, dept_name, login_url } = body;
      const emailSent = await sendCredentialsEmail(resendEmail, resendName, resendPassword, mandal_name, dept_name, login_url);
      return new Response(JSON.stringify({ success: true, email_sent: emailSent }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, email, phone, gov_id, mandal_id, department_id, active_status } = body;

    if (!name || !email || !mandal_id || !department_id) {
      return new Response(JSON.stringify({ error: "Name, email, mandal, and department are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generatedPassword = generateSecurePassword(14);
    let userId: string;

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

    let mandalName = "N/A";
    let deptName = "N/A";
    const { data: mandalData } = await supabaseAdmin.from("mandals").select("name").eq("id", mandal_id).single();
    if (mandalData) mandalName = mandalData.name;
    const { data: deptData } = await supabaseAdmin.from("departments").select("name").eq("id", department_id).single();
    if (deptData) deptName = deptData.name;

    const loginUrl = `${req.headers.get("origin") || "https://resolvit.app"}/auth`;
    const emailSent = await sendCredentialsEmail(email, name, generatedPassword, mandalName, deptName, loginUrl);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        generated_password: generatedPassword,
        email,
        email_sent: emailSent,
        mandal_name: mandalName,
        dept_name: deptName,
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
