require("dotenv").config();

const express = require("express");
const { BlobServiceClient } = require("@azure/storage-blob");

const app = express();

const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerClient = blobServiceClient.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER
);
const blobClient = containerClient.getBlockBlobClient("vault.json");

app.use(express.json());

async function streamToString(readableStream) {
    const chunks = [];

    for await (const chunk of readableStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString("utf8");
}

async function loadEntries() {
    if (!(await blobClient.exists())) {
        return [];
    }

    const downloadResponse = await blobClient.download();
    const content = await streamToString(downloadResponse.readableStreamBody);

    return JSON.parse(content);
}

async function saveEntries(entries) {
    const content = JSON.stringify(entries, null, 2);

    await blobClient.upload(content, Buffer.byteLength(content), {
        overwrite: true,
        blobHTTPHeaders: { blobContentType: "application/json" }
    });
}

app.get("/api/vault", async function (request, response) {
    response.json(await loadEntries());
});

app.get("/api/status", function (request, response) {
    response.json({ service: "vault-api", status: "running" });
});

app.post("/api/vault", async function (request, response) {
    const entries = await loadEntries();

    const newEntry = {
        id: Date.now().toString(),
        title: request.body.title,
        text: request.body.text,
        date: new Date().toLocaleString()
    };

    entries.push(newEntry);
    await saveEntries(entries);

    response.json(newEntry);
});

app.delete("/api/vault/:id", async function (request, response) {
    const entries = await loadEntries();

    const remainingEntries = entries.filter(function (entry) {
        return entry.id !== request.params.id;
    });

    await saveEntries(remainingEntries);
    response.json({ message: "Deleted" });
});

const port = process.env.PORT || 3000;

app.listen(port, function () {
    console.log("Server running at http://localhost:" + port);
});
