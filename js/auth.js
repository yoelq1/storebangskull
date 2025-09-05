// js/auth.js
import { supabase } from "./supabase.js";

const loginForm = document.getElementById("login-form");
const regForm = document.getElementById("register-form");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      alert("Login sukses!");
      window.location.href = "user.html";
    } catch (err) {
      alert(err.message || "Login gagal");
    }
  });
}

if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("reg-username").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const phone = document.getElementById("reg-phone").value.trim();

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      // simpan profile
      await supabase.from("profiles").insert([{
        id: data.user.id,
        username,
        phone,
        role: 'user'
      }]);
      alert("Registrasi berhasil. Silakan cek email untuk verifikasi (jika aktif).");
      // optional: auto-redirect to login
    } catch (err) {
      alert(err.message || "Register gagal");
    }
  });
}
