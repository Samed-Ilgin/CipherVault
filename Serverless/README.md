CipherVault Serverless Report

This folder contains an Azure Function (HTTP trigger) deployed to Azure.

The function generates a vault report with:

- number of saved messages
- encryption algorithm
- last saved message date

It fetches the data from the live CipherVault backend API and requires no
dependencies of its own.

Live endpoint:
https://ciphervault-report2.azurewebsites.net/api/ReportFunction
