// =========================================
// CONFIGURATION
// =========================================
// REPLACE THIS WITH YOUR NEW DEPLOYMENT URL
const API_URL = "https://script.google.com/macros/s/AKfycbzNop142IWKstr98_-5DvRkPitxJgAONlsIBB0mHMNXtz7vgK3NGcysEVBBQaB6G3K1/exec"; 

// =========================================
// STATE & DOM ELEMENTS
// =========================================
const loader = document.getElementById('loader');
const accountsContainer = document.getElementById('accountsContainer');

// Admin Modal Elements
const adminBtn = document.getElementById('adminBtn');
const adminModal = document.getElementById('adminModal');
const closeAdmin = document.getElementById('closeAdmin');
const transactionForm = document.getElementById('transactionForm');
const formFeedback = document.getElementById('formFeedback');
const submitBtn = document.querySelector('.submit-btn');

// History Modal Elements
const historyModal = document.getElementById('historyModal');
const closeHistory = document.getElementById('closeHistory');
const historyTitle = document.getElementById('historyTitle');
const historyTableBody = document.getElementById('historyTableBody');
const historyTotal = document.getElementById('historyTotal');

// Global Storage for Data
let allTransactions = [];

// =========================================
// INITIALIZATION
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    document.getElementById('tDate').valueAsDate = new Date();
});

// =========================================
// FETCH DATA & CALCULATE TOTALS
// =========================================
async function fetchData() {
    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (result.status === 'success') {
            allTransactions = result.data; // Store raw data globally
            calculateAndDisplayTotals(allTransactions);
            
            loader.style.display = 'none';
            accountsContainer.style.display = 'grid';
        } else {
            throw new Error(result.message || "Unknown error");
        }

    } catch (error) {
        loader.innerHTML = `Error: ${error.message}`;
        loader.style.color = 'red';
    }
}

function calculateAndDisplayTotals(transactions) {
    // Initialize balances
    let balances = {
        "Acc1": 0, "Acc2": 0, "Acc3": 0,
        "Acc4": 0, "Acc5": 0, "Acc6": 0
    };

    // Calculate
    transactions.forEach(t => {
        let amt = parseFloat(t.amount) || 0;
        if (balances.hasOwnProperty(t.account)) {
            if (t.type === "IN") balances[t.account] += amt;
            else if (t.type === "OUT") balances[t.account] -= amt;
        }
    });

    // Update UI Cards
    for (const [acc, bal] of Object.entries(balances)) {
        const el = document.getElementById(`${acc}-total`);
        if (el) el.textContent = formatMoney(bal);
    }
}

// =========================================
// HISTORY MODAL LOGIC (VIEW BUTTONS)
// =========================================
// Add click listeners to all "View" buttons
document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const accountName = btn.getAttribute('data-account');
        openHistoryModal(accountName);
    });
});

function openHistoryModal(accountName) {
    historyTitle.textContent = `${accountName} History`;
    historyTableBody.innerHTML = ""; // Clear previous data
    
    // Filter transactions for this account
    const accountTx = allTransactions.filter(t => t.account === accountName);
    
    let runningTotal = 0;

    // Populate Table
    accountTx.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        
        // Update running total for this account
        if(t.type === "IN") runningTotal += amt;
        else runningTotal -= amt;

        const row = document.createElement('tr');
        
        // Format Date nicely
        let dateStr = t.date;
        try {
            const d = new Date(t.date);
            dateStr = d.toLocaleDateString(); 
        } catch(e) {}

        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${t.reason}</td>
            <td class="${t.type === 'IN' ? 'type-in' : 'type-out'}">${t.type}</td>
            <td>${formatMoney(amt)}</td>
        `;
        historyTableBody.appendChild(row);
    });

    // Show final balance in footer
    historyTotal.textContent = formatMoney(runningTotal);

    historyModal.style.display = "block";
}

// Utility: Currency Formatter
function formatMoney(amount) {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(amount);
}

// =========================================
// MODAL CLOSE LOGIC
// =========================================
closeAdmin.onclick = () => adminModal.style.display = "none";
closeHistory.onclick = () => historyModal.style.display = "none";
adminBtn.onclick = () => adminModal.style.display = "block";

window.onclick = (event) => {
    if (event.target == adminModal) adminModal.style.display = "none";
    if (event.target == historyModal) historyModal.style.display = "none";
}

// =========================================
// ADMIN SUBMISSION
// =========================================
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formFeedback.textContent = "Submitting...";
    formFeedback.style.color = "blue";
    submitBtn.disabled = true;

    const payload = {
        passkey: document.getElementById('adminPass').value,
        date: document.getElementById('tDate').value,
        account: document.getElementById('tAccount').value,
        type: document.getElementById('tType').value,
        amount: document.getElementById('tAmount').value,
        reason: document.getElementById('tReason').value
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.status === 'success') {
            formFeedback.textContent = "Success!";
            formFeedback.style.color = "green";
            transactionForm.reset();
            document.getElementById('tDate').valueAsDate = new Date();
            
            // Reload data so the new transaction shows up immediately
            fetchData(); 
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        formFeedback.textContent = `Error: ${error.message}`;
        formFeedback.style.color = "red";
    } finally {
        submitBtn.disabled = false;
        document.getElementById('adminPass').value = "";
    }
});