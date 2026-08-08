const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../Backend/.env") });

const { BlobServiceClient } = require("@azure/storage-blob");

const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerClient = blobServiceClient.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER
);
const blobClient = containerClient.getBlockBlobClient("vault.json");

async function streamToString(readableStream) {
    const chunks = [];

    for await (const chunk of readableStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString("utf8");
}

exports.handler = async function () {
    let messages = [];

    if (await blobClient.exists()) {
        const downloadResponse = await blobClient.download();
        const content = await streamToString(downloadResponse.readableStreamBody);
        messages = JSON.parse(content);
    }

    const lastMessage = messages[messages.length - 1];

    const report = {
        savedMessages: messages.length,
        encryptionAlgorithm: "AES-256-GCM",
        lastSavedMessageDate: "No saved messages yet"
    };

    if (lastMessage) {
        report.lastSavedMessageDate = lastMessage.date;
    }

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(report, null, 2)
    };
};

if (require.main === module) {
    exports.handler().then(function (response) {
        console.log(response.body);
    });
}
