// =======================
// ADMIN SCRIPT
// =======================

// LOGIN ADMIN (username + password manual)
const loginForm = document.getElementById("admin-login-form");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = document.getElementById("admin-username").value;
    const pass = document.getElementById("admin-password").value;

    if (user === "admin" && pass === "admin112233") {
      alert("Berhasil login!");
      window.location.href = "dashboard.html";
    } else {
      document.getElementById("msg").innerText = "Username atau password salah!";
    }
  });
}

// KELOLA PRODUK
const addForm = document.getElementById("add-product-form");
const productTable = document.getElementById("product-table");

async function fetchProducts() {
  const { data, error } = await supabase.from("products").select("*");
  if (error) console.error(error);
  if (productTable) {
    productTable.innerHTML = data
      .map(
        (p) => `
        <tr>
          <td>${p.name}</td>
          <td>Rp ${p.price}</td>
          <td><img src="${p.image_url}" width="50"/></td>
          <td>
            <button onclick="deleteProduct(${p.id})">Hapus</button>
          </td>
        </tr>`
      )
      .join("");
  }
}

if (productTable) {
  fetchProducts();
  supabase
    .channel("products")
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchProducts)
    .subscribe();
}

if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("product-name").value;
    const price = document.getElementById("product-price").value;
    const image = document.getElementById("product-image").value;

    const { error } = await supabase.from("products").insert([{ name, price, image_url: image }]);
    if (error) {
      console.error(error);
      alert("Gagal tambah produk");
    } else {
      addForm.reset();
      alert("Produk berhasil ditambahkan!");
    }
  });
}

async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) console.error(error);
}
