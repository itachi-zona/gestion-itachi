import { neon } from "@neondatabase/serverless";

// Reutiliza la conexión entre invocaciones (serverless-friendly).
export const sql = neon(process.env.DATABASE_URL);
