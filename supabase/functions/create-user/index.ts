import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; // Assuma shared utils; se não, defina inline

// Use service role for admin actions
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Manual auth: Verify JWT from Authorization header
    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check role: Only gestor/admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || (profile.role !== 'gestor' && profile.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Parse request body
    const { email, password, first_name, role } = await req.json();
    if (!email || !password || !first_name || !['colaborador', 'gestor', 'admin'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid fields' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create user in Auth (admin method)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for tests
      user_metadata: { first_name, role },
    });
    if (createError) throw createError;

    // Profile is auto-created by trigger handle_new_user
    // Log the action for audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'usuario_criado',
      details: { new_user_id: newUser.user.id, role, email },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Usuário criado com sucesso!', 
      user_id: newUser.user.id 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in create-user:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});