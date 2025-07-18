import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ProcessMarkerRequest {
  experienceId: string;
  markerImageUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { experienceId }: ProcessMarkerRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Since we're using AR.js with HIRO markers, we don't need to process custom markers
    // Just mark the experience as ready immediately
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/ar_experiences?id=eq.${experienceId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          marker_mind_url: 'hiro', // Using built-in HIRO marker
          marker_fset_url: 'hiro',
          marker_fset3_url: 'hiro',
          status: 'ready',
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update experience record:', errorText);
      throw new Error(`Failed to update experience record: ${errorText}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        experienceId,
        message: 'Experience ready for AR viewing with HIRO marker',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing marker:', error);

    // Mark experience as failed
    try {
      const body = await req.clone().json();
      const { experienceId } = body;
      
      if (experienceId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        await fetch(
          `${supabaseUrl}/rest/v1/ar_experiences?id=eq.${experienceId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'failed' }),
          }
        );
      }
    } catch (updateError) {
      console.error('Failed to update experience status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});