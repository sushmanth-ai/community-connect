import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      name,
      email,
      phone,
      gov_id,
      mandal_id,
      department_id,
      active_status,
      _action,
      password,
      mandal_name,
      dept_name,
      login_url,
    } = await req.json();

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // If action is to resend email only
    if (_action === "resend_email") {
      const emailSent = await sendCredentialsEmail(
        email,
        password,
        name,
        mandal_name,
        dept_name,
        login_url
      );

      return new Response(
        JSON.stringify({
          email_sent: emailSent,
          message: emailSent ? "Email sent successfully" : "Failed to send email",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Generate a random password
    const generatedPassword = generatePassword();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    const userId = authData.user.id;

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        name,
        mobile_number: phone,
        gov_id,
        mandal_id,
        active_status: active_status ?? true,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    // Create user role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "authority",
        department_id,
      });

    if (roleError) {
      console.error("Role creation error:", roleError);
      throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    // Get mandal and department names
    const { data: mandalData } = await supabaseAdmin
      .from("mandals")
      .select("name")
      .eq("id", mandal_id)
      .single();

    const { data: deptData } = await supabaseAdmin
      .from("departments")
      .select("name")
      .eq("id", department_id)
      .single();

    // Send credentials email
    let emailSent = false;
    try {
      emailSent = await sendCredentialsEmail(
        email,
        generatedPassword,
        name,
        mandalData?.name || "",
        deptData?.name || "",
        `${Deno.env.get("PUBLIC_SITE_URL") || "http://localhost:3000"}/auth`
      );
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Don't fail the whole operation if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        generated_password: generatedPassword,
        email_sent: emailSent,
        mandal_name: mandalData?.name || "",
        dept_name: deptData?.name || "",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-authority function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        email_sent: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

// Function to send credentials email
async function sendCredentialsEmail(
  email: string,
  password: string,
  name: string,
  mandalName: string,
  deptName: string,
  loginUrl: string
): Promise<boolean> {
  try {
    // Using Resend.com (recommended for Supabase)
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resolvit.in",
        to: email,
        subject: "Your ResolvIt Authority Login Credentials",
        html: generateEmailHTML(name, email, password, mandalName, deptName, loginUrl),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Resend API error:", errorData);
      return false;
    }

    console.log(`Email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error("Email sending exception:", error);
    return false;
  }
}

// Function to generate email HTML
function generateEmailHTML(
  name: string,
  email: string,
  password: string,
  mandalName: string,
  deptName: string,
  loginUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
          .content { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .credentials { background: #fff; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ResolvIt</h1>
            <p>Your Authority Account is Ready</p>
          </div>

          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your authority account has been created successfully in the ResolvIt system.</p>

            <h3>Account Details:</h3>
            <div class="credentials">
              <p><strong>Mandal:</strong> ${mandalName}</p>
              <p><strong>Department:</strong> ${deptName}</p>
              <p><strong>Email:</strong> <code>${email}</code></p>
              <p><strong>Password:</strong> <code>${password}</code></p>
            </div>

            <h3>Next Steps:</h3>
            <ol>
              <li>Visit <a href="${loginUrl}">${loginUrl}</a></li>
              <li>Login with your email and password</li>
              <li>Change your password on first login</li>
              <li>Start managing issues in your jurisdiction</li>
            </ol>

            <p style="color: #d32f2f; font-weight: bold;">⚠️ Important: Keep your password confidential and change it immediately after first login.</p>
          </div>

          <div class="footer">
            <p>This is an automated email. Please do not reply to this address.</p>
            <p>&copy; 2024 ResolvIt. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Function to generate a secure random password
function generatePassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
