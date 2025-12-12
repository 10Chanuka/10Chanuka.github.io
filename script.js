// Cash Book System - script.js

// Local Storage Handling
const STORAGE_KEY = "cashbook_data";

function loadData() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        admin: { username: "admin", password: "admin123" },
        accounts: [],
    };
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let db = loadData();
let app = document.getElementById("app");

// Render Functions
function showLogin() {
    app.innerHTML = `
        <div class="container card">
            <h2>Admin / Member Login</h2>
            <select id="loginType">
                <option value="admin">Admin Login</option>
                <option value="member">Member Login</option>
            </select>
            <input id="username" placeholder="Username / Account ID" />
            <input id="password" placeholder="Password" type="password" />
            <button onclick="login()">Login</button>
        </div>
    `;
}

function login() {
    let type = document.getElementById("loginType").value;
    let uname = document.getElementById("username").value;
    let pass = document.getElementById("password").value;

    if (type === "admin") {
        if (uname === db.admin.username && pass === db.admin.password) {
            showAdminPanel();
        } else alert("Invalid Admin Login!");
    } else {
        let acc = db.accounts.find(a => a.id === uname && a.password === pass);
        if (acc) showMemberView(acc.id);
        else alert("Invalid Member Login!");
    }
}

// Admin Panel
function showAdminPanel() {
    app.innerHTML = `
        <header>
            <div class="logo">Admin Panel</div>
            <button onclick="showLogin()">Logout</button>
        </header>

        <div class="container">
            <div class="card">
                <h3>Create Account</h3>
                <input id="accName" placeholder="Member Name" />
                <input id="accPass" placeholder="Password" />
                <button onclick="createAccount()">Create</button>
            </div>

            <div class="card">
                <h3>Add Transaction</h3>
                <input id="tAcc" placeholder="Account ID" />
                <input id="tDesc" placeholder="Description" />
                <input id="tAmount" placeholder="Amount (+profit / -loss)" />
                <button onclick="addTransaction()">Add</button>
            </div>

            <div class="card">
                <h3>All Accounts</h3>
                ${renderAccountsTable()}
            </div>
        </div>
    `;
}

function createAccount() {
    let name = document.getElementById("accName").value;
    let pass = document.getElementById("accPass").value;

    const id = "ACC" + Math.floor(Math.random() * 100000);

    if (!name || !pass) return alert("Enter all details!");

    db.accounts.push({ id, name, password: pass, transactions: [] });
    saveData(db);
    alert("Account Created! → ID: " + id);
    showAdminPanel();
}

function addTransaction() {
    let id = document.getElementById("tAcc").value;
    let desc = document.getElementById("tDesc").value;
    let amount = parseFloat(document.getElementById("tAmount").value);

    let acc = db.accounts.find(a => a.id === id);
    if (!acc) return alert("Invalid Account ID!");

    acc.transactions.push({ desc, amount, time: new Date().toLocaleString() });
    saveData(db);
    alert("Transaction Added!");
    showAdminPanel();
}

function renderAccountsTable() {
    let html = `<table><tr><th>ID</th><th>Name</th><th>Balance</th></tr>`;
    db.accounts.forEach(acc => {
        let balance = acc.transactions.reduce((s, t) => s + t.amount, 0);
        html += `<tr><td>${acc.id}</td><td>${acc.name}</td><td>${balance}</td></tr>`;
    });
    return html + "</table>";
}

// Member View
function showMemberView(id) {
    let acc = db.accounts.find(a => a.id === id);

    app.innerHTML = `
        <header>
            <div class="logo">Member: ${acc.name}</div>
            <button onclick="showLogin()">Logout</button>
        </header>
        <div class="container card">
            <h3>Your Transactions</h3>
            ${renderMemberTable(acc)}
        </div>
    `;
}

function renderMemberTable(acc) {
    let balance = acc.transactions.reduce((s, t) => s + t.amount, 0);

    let html = `<p><b>Balance: ${balance}</b></p><table>
        <tr><th>Description</th><th>Amount</th><th>Date</th></tr>`;

    acc.transactions.forEach(t => {
        html += `<tr><td>${t.desc}</td><td>${t.amount}</td><td>${t.time}</td></tr>`;
    });

    return html + "</table>";
}

// Start App
showLogin();
