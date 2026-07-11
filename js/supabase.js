// ============================================
// BearTrack Cloud Module
// Central database layer for BearTrack
// ============================================

const BHM_STORE_KEY = 'beartrackRecords';

let supabaseClient = null;
const cfg = getConfig();
function getConfig() {
    if (window.BHM_SUPABASE) {
        return window.BHM_SUPABASE;
    }

    if (window.BEAROPS_SUPABASE_URL) {
        return {
            url: window.BEAROPS_SUPABASE_URL,
            anonKey: window.BEAROPS_SUPABASE_ANON_KEY,
            storageBucket: 'beartrack-photos'
        };
    }

    return {};
}
