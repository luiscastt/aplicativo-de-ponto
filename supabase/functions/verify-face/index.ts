// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Inicializar Supabase Client (Anon Key + JWT for RLS)
  const supabaseClient = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  // 2. Autenticação Manual
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

  if (userError || !user) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { image_hash, user_id } = await req.json();

    if (!image_hash || !user_id) {
      return new Response(JSON.stringify({ success: false, error: 'Missing image_hash or user_id.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Placeholder for actual Facial Recognition Logic ---
    // Simulating verification result based on request requirements.
    
    const confidence = Math.random() > 0.1 ? 0.95 : 0.70;
    const threshold = 0.85;
    const match = confidence >= threshold;

    // Log the verification attempt
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'face_verification_attempt',
      details: { 
        target_user_id: user_id,
        match: match,
        confidence: parseFloat(confidence.toFixed(2))
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      match: match, 
      confidence: parseFloat(confidence.toFixed(2)), 
      threshold: threshold 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('General error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});