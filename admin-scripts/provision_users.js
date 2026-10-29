require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const allowedRoles = new Set(["owner", "kasir", "pelayan"]);
const [email, posRole] = process.argv.slice(2);
const password = process.env.STAFF_INITIAL_PASSWORD;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env.");
  }
  if (!email || !posRole) {
    throw new Error(
      "Pemakaian: node provision_users.js <email> <owner|kasir|pelayan>",
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Format email tidak valid.");
  }
  if (!allowedRoles.has(posRole)) {
    throw new Error("Role harus salah satu dari: owner, kasir, pelayan.");
  }
  if (!password || password.length < 12) {
    throw new Error("STAFF_INITIAL_PASSWORD wajib diisi dan minimal 12 karakter.");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { pos_role: posRole },
  });

  if (error) {
    throw new Error(`Gagal membuat akun Supabase: ${error.message}`);
  }
  if (!data.user) {
    throw new Error("Supabase tidak mengembalikan data user setelah pembuatan akun.");
  }

  console.log(`Akun staf berhasil dibuat: ${data.user.email}`);
  console.log(`User ID: ${data.user.id}`);
  console.log(`Role POS: ${data.user.app_metadata?.pos_role || posRole}`);
}

main().catch((error) => {
  fail(error.message || "Terjadi kesalahan saat membuat akun.");
});
