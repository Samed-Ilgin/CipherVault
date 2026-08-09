console.log("CipherVault loaded!");

const apiUrl = "https://ciphervault-backend.thankfulcoast-1032c8c1.polandcentral.azurecontainerapps.io/api/vault";

function getById(id) {
    return document.getElementById(id);
}

function toBase64(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(text) {
    return Uint8Array.from(atob(text), function (char) {
        return char.charCodeAt(0);
    });
}

async function makeKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function encryptText(message, password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await makeKey(password, salt);

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoder.encode(message)
    );

    return JSON.stringify({
        salt: toBase64(salt),
        iv: toBase64(iv),
        data: toBase64(encrypted)
    });
}

async function decryptText(encryptedText, password) {
    const decoder = new TextDecoder();
    const savedData = JSON.parse(encryptedText);
    const salt = fromBase64(savedData.salt);
    const iv = fromBase64(savedData.iv);
    const data = fromBase64(savedData.data);
    const key = await makeKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        data
    );

    return decoder.decode(decrypted);
}

async function loadVault() {
    const response = await fetch(apiUrl);
    return await response.json();
}

async function saveVault(title, text) {
    await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title: title,
            text: text
        })
    });
}

async function deleteVaultEntry(id) {
    await fetch(apiUrl + "/" + id, {
        method: "DELETE"
    });

    await showVaultEntries();
}

async function handleEncrypt() {
    const title = getById("title").value.trim();
    const key = getById("key").value;
    const message = getById("message").value;
    const result = getById("encrypted-result");

    if (title === "" || key === "" || message === "") {
        alert("Please enter a title, key, and message.");
        return;
    }

    result.value = await encryptText(message, key);
}

function handleCopy() {
    const result = getById("encrypted-result");

    if (result.value === "") {
        alert("There is nothing to copy yet.");
        return;
    }

    navigator.clipboard.writeText(result.value);
    alert("Encrypted text copied.");
}

async function handleSave() {
    const title = getById("title").value.trim();
    const encryptedText = getById("encrypted-result").value;

    if (title === "" || encryptedText === "") {
        alert("Encrypt a message before saving.");
        return;
    }

    await saveVault(title, encryptedText);

    alert("Saved to vault.");
}

async function handleDecrypt() {
    const key = getById("key").value;
    const message = getById("message").value;
    const result = getById("decrypted-result");

    if (key === "" || message === "") {
        alert("Please enter the key and encrypted message.");
        return;
    }

    try {
        result.value = await decryptText(message, key);
    } catch (error) {
        result.value = "";
        alert("Could not decrypt. Check the key or encrypted message.");
    }
}

async function showVaultEntries() {
    const vaultEntries = getById("vault-entries");
    const search = getById("search");

    if (!vaultEntries) {
        return;
    }

    const searchText = search ? search.value.toLowerCase() : "";
    const entries = await loadVault();
    const filteredEntries = entries.filter(function (entry) {
        return entry.title.toLowerCase().includes(searchText);
    });

    vaultEntries.innerHTML = "";

    if (filteredEntries.length === 0) {
        vaultEntries.innerHTML = "<p>No saved messages found.</p>";
        return;
    }

    filteredEntries.forEach(function (entry) {
        const box = document.createElement("div");
        const title = document.createElement("h3");
        const date = document.createElement("p");
        const text = document.createElement("textarea");
        const deleteButton = document.createElement("button");

        box.className = "vault-entry";
        title.textContent = entry.title;
        date.textContent = entry.date;
        text.value = entry.text;
        text.readOnly = true;
        deleteButton.className = "button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", function () {
            deleteVaultEntry(entry.id);
        });

        box.appendChild(title);
        box.appendChild(date);
        box.appendChild(text);
        box.appendChild(deleteButton);
        vaultEntries.appendChild(box);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const encryptButton = getById("encrypt-btn");
    const copyButton = getById("copy-btn");
    const saveButton = getById("save-btn");
    const decryptButton = getById("decrypt-btn");
    const searchBox = getById("search");

    if (encryptButton) {
        encryptButton.addEventListener("click", handleEncrypt);
    }

    if (copyButton) {
        copyButton.addEventListener("click", handleCopy);
    }

    if (saveButton) {
        saveButton.addEventListener("click", handleSave);
    }

    if (decryptButton) {
        decryptButton.addEventListener("click", handleDecrypt);
    }

    if (searchBox) {
        searchBox.addEventListener("input", showVaultEntries);
        showVaultEntries();
    }
});
