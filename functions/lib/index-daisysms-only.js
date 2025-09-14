"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daisySmsWebhook = exports.daisySmsProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// DaisySMS secret (CRITICAL: Move API key to server-side)
const daisySmsApiKey = (0, params_1.defineSecret)('DAISYSMS_API_KEY');
// Secure DaisySMS API proxy (protects API key)
exports.daisySmsProxy = (0, https_1.onCall)({
    cors: true,
    secrets: [daisySmsApiKey]
}, async (request) => {
    const { data, auth } = request;
    try {
        // Verify user is authenticated
        if (!auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { action, params } = data;
        // Validate action
        if (!action || typeof action !== 'string') {
            throw new https_1.HttpsError('invalid-argument', 'Action is required');
        }
        // Get API key securely
        const apiKey = daisySmsApiKey.value();
        if (!apiKey) {
            throw new https_1.HttpsError('failed-precondition', 'DaisySMS API key not configured');
        }
        // Build query parameters securely
        const queryParams = new URLSearchParams(Object.assign({ api_key: apiKey, action: action }, params));
        console.log('DaisySMS API call:', { action, userId: auth.uid });
        // Make secure API call to DaisySMS
        const response = await fetch(`https://daisysms.com/stubs/handler_api.php?${queryParams}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'InstantNums/1.0'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        if (!response.ok) {
            throw new https_1.HttpsError('internal', 'DaisySMS API request failed');
        }
        const result = await response.text();
        // Log usage for admin monitoring
        console.log('DaisySMS API response received for user:', auth.uid);
        return {
            success: true,
            result: result
        };
    }
    catch (error) {
        console.error('DaisySMS proxy error:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `DaisySMS API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// DaisySMS webhook handler for SMS notifications
exports.daisySmsWebhook = (0, https_1.onRequest)({
    cors: true
}, async (req, res) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).send('');
        return;
    }
    try {
        if (req.method !== 'POST') {
            res.status(405).send('Method not allowed');
            return;
        }
        const webhookData = req.body;
        console.log('DaisySMS webhook received:', webhookData);
        // Parse webhook data according to DaisySMS format:
        // { activationId, messageId, service, text, code, country, receivedAt }
        const activationId = webhookData.activationId;
        const messageId = webhookData.messageId;
        const service = webhookData.service;
        const text = webhookData.text;
        const code = webhookData.code;
        const country = webhookData.country;
        const receivedAt = webhookData.receivedAt;
        if (!activationId || !code) {
            console.warn('Invalid DaisySMS webhook data:', webhookData);
            res.status(400).send('Missing required fields');
            return;
        }
        console.log(`DaisySMS SMS received for activation ${activationId}: ${code}`);
        // Update rental status in Firestore
        try {
            const rentalRef = db.collection('rentals').doc(activationId);
            const rentalDoc = await rentalRef.get();
            if (rentalDoc.exists()) {
                await rentalRef.update({
                    status: 'completed',
                    code: code,
                    smsText: text,
                    completedAt: firestore_2.FieldValue.serverTimestamp(),
                    lastChecked: firestore_2.FieldValue.serverTimestamp()
                });
                console.log(`Updated rental ${activationId} with code ${code}`);
            }
            else {
                console.warn(`Rental ${activationId} not found in database`);
            }
        }
        catch (updateError) {
            console.error('Error updating rental:', updateError);
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('DaisySMS webhook error:', error);
        res.status(500).send('Internal server error');
    }
});
//# sourceMappingURL=index-daisysms-only.js.map