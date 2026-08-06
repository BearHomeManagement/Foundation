// ============================================
// BearTrack Cloud Module
// Central database layer for BearTrack
// ============================================

(() => {
  'use strict';

  let client = null;

  function getConfig() {
    if (window.BHM_SUPABASE?.url && window.BHM_SUPABASE?.anonKey) {
      return {
        url: window.BHM_SUPABASE.url,
        anonKey: window.BHM_SUPABASE.anonKey,
        storageBucket: window.BHM_SUPABASE.storageBucket || 'beartrack-photos'
      };
    }

    if (window.BEAROPS_SUPABASE_URL && window.BEAROPS_SUPABASE_ANON_KEY) {
      return {
        url: window.BEAROPS_SUPABASE_URL,
        anonKey: window.BEAROPS_SUPABASE_ANON_KEY,
        storageBucket: 'beartrack-photos'
      };
    }

    throw new Error('BearTrack Supabase configuration is missing.');
  }

  async function getClient() {
    if (client) return client;

    const cfg = getConfig();

    if (window.supabase?.createClient) {
      client = window.supabase.createClient(cfg.url, cfg.anonKey);
      return client;
    }

    const mod = await import('https://esm.sh/@supabase/supabase-js@2');
    client = mod.createClient(cfg.url, cfg.anonKey);
    return client;
  }

  async function select(table, options = {}) {
    const db = await getClient();
    let query = db.from(table).select(options.columns || '*');

    if (options.eq) {
      for (const [column, value] of Object.entries(options.eq)) {
        query = query.eq(column, value);
      }
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.ascending ?? true
      });
    }

    if (options.limit) query = query.limit(options.limit);
    if (options.single) query = query.single();

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async function insert(table, payload, options = {}) {
    const db = await getClient();
    let query = db.from(table).insert(payload);
    if (options.select !== false) query = query.select(options.columns || '*');
    if (options.single) query = query.single();

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async function update(table, id, payload, idColumn = 'id') {
    const db = await getClient();
    const { data, error } = await db
      .from(table)
      .update(payload)
      .eq(idColumn, id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async function remove(table, id, idColumn = 'id') {
    const db = await getClient();
    const { error } = await db.from(table).delete().eq(idColumn, id);
    if (error) throw error;
  }

  async function getSession() {
    const db = await getClient();
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function signIn(email, password) {
    const db = await getClient();
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const db = await getClient();
    const { error } = await db.auth.signOut();
    if (error) throw error;
  }
async function requestPasswordReset(email) {
  const db = await getClient();
  const cleanEmail = String(email || '').trim();

  if (!cleanEmail) {
    throw new Error('Email is required.');
  }

  const redirectTo =
    `${window.location.origin}/app/reset-password.html`;

  const { data, error } =
    await db.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo
    });

  if (error) throw error;
  return data;
}

async function updatePassword(password) {
  const db = await getClient();
  const cleanPassword = String(password || '');

  if (cleanPassword.length < 8) {
    throw new Error(
      'Password must be at least 8 characters.'
    );
  }

  const { data, error } =
    await db.auth.updateUser({
      password: cleanPassword
    });

  if (error) throw error;
  return data;
}
  
 window.BearTrackDB = {
  getClient,
  getSession,
  signIn,
  signOut,
  requestPasswordReset,
  updatePassword,
  select,
  insert,
  update,
  remove
};
