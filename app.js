const STORAGE_KEY = "id_checker_records_v1";

let records = loadRecords();

function loadRecords() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveRecords() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        return true;
    } catch {
        alert("Saqlash amalga oshmadi. Brauzer xotirasini tekshiring.");
        return false;
    }
}

function normalizeId(value) {
    return String(value).trim();
}

function formatMoney(value) {
    return Number(value || 0).toLocaleString("uz-UZ") + " so'm";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function updateStats() {
    document.getElementById("total").textContent = records.length;

    const winners = records.filter(item => Number(item.prize) > 0);

    document.getElementById("winners").textContent = winners.length;

    const totalPrize = winners.reduce(
        (sum, item) => sum + Number(item.prize || 0),
        0
    );

    document.getElementById("prizeTotal").textContent =
        formatMoney(totalPrize);
}

function renderRecords(list = records) {
    const container = document.getElementById("records");

    if (!list.length) {
        container.innerHTML = "<p class='hint'>Hozircha ID yo'q.</p>";
        return;
    }

    container.innerHTML = list.map(item => `
        <div class="record">
            <p><b>${escapeHTML(item.appName)}</b></p>
            <p>ID: <code>${escapeHTML(item.id)}</code></p>
            <p>Username: ${escapeHTML(item.username || "Kiritilmagan")}</p>
            <p>Yutuq: ${
                Number(item.prize) > 0
                    ? escapeHTML(formatMoney(item.prize))
                    : "Yutuq yo'q"
            }</p>
            <p>Izoh: ${escapeHTML(item.note || "—")}</p>
            <button onclick="deleteRecord('${item.uid}')"
                    class="danger">O'chirish</button>
        </div>
    `).join("");
}

function refresh() {
    updateStats();
    renderRecords();
}

document.getElementById("idForm").addEventListener("submit", event => {
    event.preventDefault();

    const appName = document.getElementById("appName").value.trim();
    const id = normalizeId(document.getElementById("accountId").value);
    const username = document.getElementById("username").value.trim();
    const prizeText = document.getElementById("prize").value;
    const note = document.getElementById("note").value.trim();

    if (!appName || !id) {
        alert("Ilova nomi va ID majburiy.");
        return;
    }

    if (!/^\d+$/.test(id)) {
        alert("ID faqat raqamlardan iborat bo'lishi kerak.");
        return;
    }

    if (records.some(item =>
        item.id === id &&
        item.appName.toLowerCase() === appName.toLowerCase()
    )) {
        alert("Bu ID shu ilova uchun oldin saqlangan.");
        return;
    }

    const prize = prizeText === "" ? 0 : Number(prizeText);

    if (!Number.isFinite(prize) || prize < 0) {
        alert("Yutuq summasini tekshiring.");
        return;
    }

    records.push({
        uid: crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()) + Math.random().toString(36).slice(2),
        appName,
        id,
        username,
        prize,
        note,
        createdAt: new Date().toISOString()
    });

    if (!saveRecords()) {
        records.pop();
        return;
    }

    event.target.reset();
    refresh();
    alert("ID muvaffaqiyatli saqlandi!");
});

function deleteRecord(uid) {
    if (!confirm("Shu ID'ni o'chirmoqchimisiz?")) return;

    const oldRecords = records;
    records = records.filter(item => item.uid !== uid);

    if (!saveRecords()) {
        records = oldRecords;
        return;
    }

    refresh();
}

document.getElementById("search").addEventListener("input", event => {
    const query = event.target.value.trim().toLowerCase();

    const filtered = records.filter(item =>
        item.id.toLowerCase().includes(query) ||
        item.appName.toLowerCase().includes(query) ||
        item.username.toLowerCase().includes(query) ||
        item.note.toLowerCase().includes(query)
    );

    renderRecords(filtered);
});

document.getElementById("checkBtn").addEventListener("click", () => {
    const input = document.getElementById("bulkIds").value;

    const ids = input
        .split(/[\n,\t; ]+/)
        .map(normalizeId)
        .filter(Boolean);

    const container = document.getElementById("checkResults");

    if (!ids.length) {
        container.innerHTML = "<p>ID kiriting.</p>";
        return;
    }

    if (ids.length > 5000) {
        container.innerHTML =
            "<p class='not-found'>Bir tekshiruvda ko'pi bilan 5000 ta ID.</p>";
        return;
    }

    const uniqueIds = [...new Set(ids)];

    const html = uniqueIds.map(id => {
        if (!/^\d+$/.test(id)) {
            return `
                <div class="record">
                    <p>${escapeHTML(id)}</p>
                    <b class="not-found">Noto'g'ri ID formati</b>
                </div>
            `;
        }

        const matches = records.filter(item => item.id === id);

        if (!matches.length) {
            return `
                <div class="record">
                    <p>ID: <code>${escapeHTML(id)}</code></p>
                    <b class="not-found">❌ Bazada topilmadi</b>
                </div>
            `;
        }

        return matches.map(item => `
            <div class="record">
                <p>ID: <code>${escapeHTML(id)}</code></p>
                <b class="found">✅ Bazada mavjud</b>
                <p>Ilova: ${escapeHTML(item.appName)}</p>
                <p>Username: ${escapeHTML(item.username || "Kiritilmagan")}</p>
                <p>Yutuq: ${
                    Number(item.prize) > 0
                        ? escapeHTML(formatMoney(item.prize))
                        : "Yutuq yo'q"
                }</p>
            </div>
        `).join("");
    });

    container.innerHTML = `
        <p>Tekshirilgan: ${uniqueIds.length} ta noyob ID</p>
        ${html.join("")}
    `;
});

document.getElementById("clearCheck").addEventListener("click", () => {
    document.getElementById("bulkIds").value = "";
    document.getElementById("checkResults").innerHTML = "";
});

document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob(
        [JSON.stringify(records, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "id-checker-backup.json";
    link.click();

    URL.revokeObjectURL(url);
});

document.getElementById("importFile").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const imported = JSON.parse(await file.text());

        if (!Array.isArray(imported)) {
            throw new Error("JSON ro'yxat shaklida emas.");
        }

        const valid = imported.filter(item =>
            item &&
            typeof item.appName === "string" &&
            typeof item.id === "string" &&
            /^\d+$/.test(item.id) &&
            typeof item.uid === "string" &&
            Number.isFinite(Number(item.prize ?? 0)) &&
            Number(item.prize ?? 0) >= 0
        );

        if (valid.length !== imported.length) {
            throw new Error("Faylda noto'g'ri yozuvlar mavjud.");
        }

        if (!confirm(
            `${valid.length} ta yozuvni import qilish va mavjud ro'yxatga qo'shish?`
        )) return;

        const merged = [...records];

        for (const item of valid) {
            const exists = merged.some(old =>
                old.id === item.id &&
                old.appName.toLowerCase() === item.appName.toLowerCase()
            );

            if (!exists) merged.push(item);
        }

        const previous = records;
        records = merged;

        if (!saveRecords()) {
            records = previous;
            return;
        }

        refresh();
        alert("Import tugadi!");
    } catch (error) {
        alert("Faylni o'qib bo'lmadi: " + error.message);
    } finally {
        event.target.value = "";
    }
});

document.getElementById("deleteAll").addEventListener("click", () => {
    if (!confirm("Barcha ID'larni o'chirasizmi? Avval zaxira nusxa oling.")) {
        return;
    }

    const previous = records;
    records = [];

    if (!saveRecords()) {
        records = previous;
        return;
    }

    refresh();
});

refresh();
