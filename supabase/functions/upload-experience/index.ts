import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    
    const markerImage = formData.get('markerImage') as File;
    const contentFile = formData.get('contentFile') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const contentType = formData.get('contentType') as string;

    if (!markerImage || !contentFile || !name) {
      throw new Error('Missing required fields');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate unique ID for this experience
    const experienceId = crypto.randomUUID();

    // Upload marker image
    const markerImageExt = markerImage.name.split('.').pop();
    const markerImagePath = `${experienceId}_marker.${markerImageExt}`;
    
    const { data: markerImageData, error: markerImageError } = await supabase.storage
      .from('ar-markers')
      .upload(markerImagePath, markerImage, {
        cacheControl: '3600',
        upsert: false,
      });

    if (markerImageError) {
      throw new Error(`Failed to upload marker image: ${markerImageError.message}`);
    }

    // Upload content file
    const contentFileExt = contentFile.name.split('.').pop();
    const contentFilePath = `${experienceId}_content.${contentFileExt}`;
    
    const { data: contentFileData, error: contentFileError } = await supabase.storage
      .from('ar-content')
      .upload(contentFilePath, contentFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (contentFileError) {
      throw new Error(`Failed to upload content file: ${contentFileError.message}`);
    }

    // Get public URLs
    const { data: markerImageUrl } = supabase.storage
      .from('ar-markers')
      .getPublicUrl(markerImagePath);

    const { data: contentFileUrl } = supabase.storage
      .from('ar-content')
      .getPublicUrl(contentFilePath);

    // Create experience record
    const { data: experience, error: experienceError } = await supabase
      .from('ar_experiences')
      .insert({
        id: experienceId,
        name,
        description,
        marker_image_url: markerImageUrl.publicUrl,
        content_url: contentFileUrl.publicUrl,
        content_type: contentType,
        status: 'processing',
      })
      .select()
      .single();

    if (experienceError) {
      throw new Error(`Failed to create experience: ${experienceError.message}`);
    }

    // Trigger marker processing
    const processMarkerResponse = await fetch(
      `${supabaseUrl}/functions/v1/process-marker`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          experienceId,
          markerImageUrl: markerImageUrl.publicUrl,
        }),
      }
    );

    if (!processMarkerResponse.ok) {
      console.error('Failed to trigger marker processing');
      // Don't throw here, let the processing happen in background
    }

    return new Response(
      JSON.stringify({
        success: true,
        experienceId,
        experience,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error uploading experience:', error);

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