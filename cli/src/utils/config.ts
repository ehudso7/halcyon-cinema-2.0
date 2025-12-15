/**
 * CLI Configuration Utilities
 */

import Conf from 'conf';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface ConfigSchema {
  apiKey?: string;
  anthropicApiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  accessToken?: string;
  refreshToken?: string;
  defaultMode?: 'storyforge' | 'cinema';
  userId?: string;
}

let configInstance: Conf<ConfigSchema> | null = null;

export function getConfig(): Conf<ConfigSchema> {
  if (!configInstance) {
    configInstance = new Conf<ConfigSchema>({
      projectName: 'storyforge-cli',
      defaults: {
        defaultMode: 'storyforge',
      },
    });
  }
  return configInstance;
}

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const config = getConfig();
  const supabaseUrl = config.get('supabaseUrl') || process.env.SUPABASE_URL;
  const supabaseKey = config.get('supabaseKey') || config.get('apiKey') || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);

  // Set access token if available
  const accessToken = config.get('accessToken');
  if (accessToken) {
    supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: config.get('refreshToken') || '',
    });
  }

  return supabaseClient;
}

export async function ensureAuthenticated(): Promise<boolean> {
  const config = getConfig();

  // Check for API key
  if (config.get('apiKey')) {
    return true;
  }

  // Check for access token
  if (config.get('accessToken')) {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.auth.getUser();
      if (!error && data.user) {
        return true;
      }
    }
  }

  return false;
}

export function clearAuth(): void {
  const config = getConfig();
  config.delete('apiKey');
  config.delete('accessToken');
  config.delete('refreshToken');
  config.delete('userId');
}
