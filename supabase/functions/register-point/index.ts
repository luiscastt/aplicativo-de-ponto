// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to calculate distance (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon2) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Inicializar Supabase Client com a chave ANÔNIMA (para RLS)
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

  // 2. Autenticação Manual (Obrigatório em Edge Functions)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  // 3. Obter o usuário logado
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

  if (userError || !user) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const userId = user.id;

  try {
    // 4. Processar Multipart Form Data
    const formData = await req.formData();
    const metadataJson = formData.get('metadata');
    const photoFile = formData.get('photo');

    if (!metadataJson || !photoFile || !(photoFile instanceof File)) {
      return new Response(JSON.stringify({ success: false, error: 'Missing metadata or photo file.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metadata = JSON.parse(metadataJson.toString());
    const { type, lat, lon, accuracy_m, timestamp_local, timestamp_utc, fingerprint } = metadata;

    if (!type || !lat || !lon || !accuracy_m || !timestamp_local || !timestamp_utc || !fingerprint) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required metadata fields.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Validação de Geofence
    const { data: settings, error: settingsError } = await supabaseClient
      .from('company_settings')
      .select('geofence_center, geofence_radius')
      .eq('id', 'default')
      .single();

    if (settingsError) throw new Error(`Failed to fetch settings: ${settingsError.message}`);
    
    const centerLat = settings.geofence_center.lat;
    const centerLon = settings.geofence_center.lng;
    const radius = settings.geofence_radius;

    const distance = calculateDistance(lat, lon, centerLat, centerLon);
    
    let status: 'pendente' | 'aprovado' | 'rejeitado' = 'pendente';
    let message = 'Ponto registrado com sucesso. Status pendente de validação facial e geofence.';

    if (distance > radius) {
      status = 'pendente'; // Mantemos pendente, mas alertamos
      message = 'Ponto registrado, mas fora da área de geofence. Requer revisão.';
    } else {
      // Se estiver dentro do geofence, podemos considerar aprovado inicialmente, 
      // mas o status final depende da validação facial (que é feita separadamente ou posteriormente).
      // Por segurança, mantemos 'pendente' para validação facial posterior.
      message = 'Ponto registrado dentro da área permitida. Status pendente de validação facial.';
    }

    // 6. Upload da foto para Storage
    // Usamos o hash da imagem como parte do nome para evitar duplicidade e garantir rastreabilidade
    const photoPath = `${userId}/${fingerprint}-${Date.now()}.jpeg`;
    
    const { error: uploadError } = await supabaseClient.storage
      .from('point-photos')
      .upload(photoPath, photoFile, {
        contentType: photoFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Se o upload falhar, retornamos erro, pois a foto é obrigatória.
      return new Response(JSON.stringify({ success: false, error: `Failed to upload photo: ${uploadError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 7. Inserir registro na tabela 'points'
    const { error: insertError } = await supabaseClient
      .from('points')
      .insert({
        user_id: userId,
        type: type,
        timestamp: timestamp_utc, // Usamos o UTC do dispositivo
        location: { lat, lng: lon, accuracy: accuracy_m },
        photo_url: photoPath,
        status: status,
        // O campo 'created_at' é default NOW() no DB
      });

    if (insertError) {
      console.error('DB insert error:', insertError);
      // Tenta deletar a foto se a inserção falhar (cleanup)
      await supabaseClient.storage.from('point-photos').remove([photoPath]);
      throw new Error(`Failed to register point: ${insertError.message}`);
    }
    
    // 8. Retorno
    return new Response(JSON.stringify({ 
      success: true, 
      message: message,
      status: status,
      distance_m: distance.toFixed(2),
      geofence_radius: radius
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('General error:', error);
    return new Response(JSON.stringify({ success: false, error: `Internal Server Error: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});