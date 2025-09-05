const addProductForm = document.getElementById("addProductForm");
const productsTableBody = document.querySelector("#productsTable tbody");

// cek session admin
const session = JSON.parse(localStorage.getItem("supabase.auth.token"));
if (!session) {
  alert("Anda belum login sebagai admin!");
  window.location.href = "login.html";
}

// tambah produk
addProductForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("productName").value;
  const price = parseFloat(document.getElementById("productPrice").value);
  const image_url = document.getElementById("productImage").value;

  const { error } = await supabase.from("products").insert([{ name, price, image_url }]);

  if (error) {
    console.error("Insert error:", error);
    alert("Gagal tambah produk: " + error.message);
  } else {
    alert("Produk berhasil ditambahkan!");
    addProductForm.reset();
    loadProducts();
  }
});

// load produk
async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*");

  if (error) {
    console.error("Load products error:", error);
    return;
  }

  productsTableBody.innerHTML = "";
  data.forEach(p => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${p.price}</td>
      <td><img src="${p.image_url}" width="50"></td>
    `;
    productsTableBody.appendChild(row);
  });
}

// realtime listener
supabase.channel("products-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "products" }, loadProducts)
  .subscribe();

loadProducts();
