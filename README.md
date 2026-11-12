# SYMBIOTES 3.0
Vite + React + Supabase guild website. All files are at the top level (no src folder).

Deploy: upload these files to GitHub, connect the repo to Netlify, and set
VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify environment variables.
Database: run SYMBIOTES_FULL_SETUP.sql once in the Supabase SQL Editor (kept out of this zip on purpose).
LEO AI: deploy leo-edge-function.ts as a Supabase Edge Function (the site finds it as "smart-responder" or "leo") and add the secret GEMINI_API_KEY.
