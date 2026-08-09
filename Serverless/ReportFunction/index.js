module.exports = async function (context, req) {
    const response = await fetch("https://ciphervault-backend.thankfulcoast-1032c8c1.polandcentral.azurecontainerapps.io/api/vault");
    const messages = await response.json();
    const lastMessage = messages[messages.length - 1];

    const report = {
        savedMessages: messages.length,
        encryptionAlgorithm: "AES-256-GCM",
        lastSavedMessageDate: "No saved messages yet"
    };

    if (lastMessage) {
        report.lastSavedMessageDate = lastMessage.date;
    }

    context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: report
    };
};
