// =========================================================
// Ambil session dari localStorage
// =========================================================
function getSession() {
  const session = localStorage.getItem("supabase.auth.token");
  return session ? JSON.parse(session) : null;
}

// =========================================================
// Proteksi halaman admin
// =========================================================
async function checkAdminAccess() {
  const session = getSession();
  if (!session) {
    if (!window.location.href.includes("login.html")) {
      window.location.href = "login.html";
    }
    return null;
  }

  // Ambil user detail dari Supabase
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    localStorage.removeItem("supabase.auth.token");
    window.location.href = "login.html";
    return null;
  }

  // Cek role
  const role = user.app_metadata?.role;
  if (role !== "admin") {
    alert("Akses ditolak. Anda bukan admin!");
    await supabase.auth.signOut();
    localStorage.removeItem("supabase.auth.token");
    window.location.href = "login.html";
    return null;
  }

  return user;
}

// =========================================================
// Login page logic
// =========================================================
async function handleLoginPage() {
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");

  if (!loginForm) return; // bukan di halaman login

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error);
      loginMessage.textContent = "Login gagal: " + error.message;
    } else if (data.session) {
      // simpan session
      localStorage.setItem("supabase.auth.token", JSON.stringify(data.session));

      // cek role
      const role = data.user?.app_metadata?.role || data.session.user?.app_metadata?.role;
      if (role !== "admin") {
        loginMessage.textContent = "Akses ditolak. Anda bukan admin!";
        await supabase.auth.signOut();
        localStorage.removeItem("supabase.auth.token");
      } else {
        loginMessage.textContent = "Login berhasil!";
        window.location.href = "dashboard.html";
      }
    }
  });
}

// =========================================================
// Logout logic
// =========================================================
async function handleLogout() {
  if (window.location.href.includes("logout.html")) {
    await supabase.auth.signOut();
    localStorage.removeItem("supabase.auth.token");
    alert("Anda sudah logout.");
    window.location.href = "login.html";
  }
}

// =========================================================
// Init script untuk semua halaman admin
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {
  if (!window.location.href.includes("login.html")) {
    await checkAdminAccess(); // proteksi semua halaman selain login
  }

  handleLoginPage();
  handleLogout();
});
