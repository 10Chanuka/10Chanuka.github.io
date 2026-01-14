const API_URL = "https://script.google.com/macros/s/AKfycby5LhIzjJ_wRjxxKQeSM4okU5ysFN_QKFZTgBypPfpkooiCFE3gy92hcLkEeVuQPwQ/exec";


// Load data (public)
fetch(API_URL)
.then(res => res.json())
.then(data => {
const tbody = document.querySelector("#dataTable tbody");
if (!tbody) return;


data.forEach(row => {
const tr = document.createElement("tr");
tr.innerHTML = `
<td>${row.Date}</td>
<td>${row.Account}</td>
<td>${row.Type}</td>
<td>${row.Amount}</td>
<td>${row.Reason}</td>`;
tbody.appendChild(tr);
});
});

// Admin submit
const form = document.getElementById("entryForm");
if (form) {
form.addEventListener("submit", e => {
e.preventDefault();


const data = {
Date: date.value,
Account: account.value,
Type: type.value,
Amount: amount.value,
Reason: reason.value
};


fetch(API_URL, {
method: "POST",
body: JSON.stringify(data)
}).then(() => alert("Saved"));
});
}