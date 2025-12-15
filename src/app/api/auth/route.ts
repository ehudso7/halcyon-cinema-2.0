import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

// GET /api/auth - Get current user context
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ user: null, profile: null });
    }

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ user, profile: null });
    }

    // Get feature flags for user
    const { data: features } = await supabase.rpc('get_user_features', {
      p_user_id: user.id,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_confirmed_at !== null,
      },
      profile,
      features: features || [],
    });
  } catch (error) {
    console.error('GET /api/auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
