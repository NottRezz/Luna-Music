/**
 * Expo config — loads EXPO_PUBLIC_Supabase keys into `extra` for the client.
 * Prefer a `.env` file (see `.env.example`); Expo CLI injects EXPO_PUBLIC_* automatically.
 */

const appJson = require('./app.json');

module.exports = ({ config }) => ({
  ...config,
  ...appJson.expo,
  extra: {
    ...(appJson.expo.extra ?? {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
});
