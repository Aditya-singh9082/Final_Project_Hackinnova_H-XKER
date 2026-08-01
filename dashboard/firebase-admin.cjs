'use strict';
/**
 * firebase-admin.cjs — Server-side Firebase Admin SDK
 * Credentials are loaded from root .env — NEVER exposed to the frontend.
 * Gracefully disables Firestore if credentials are placeholders/missing.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let db = null;
let adminAuth = null;
let admin = null;

try {
    admin = require('firebase-admin');
    const { getFirestore } = require('firebase-admin/firestore');
    const { getAuth } = require('firebase-admin/auth');

    const apps = admin.getApps ? admin.getApps() : (admin.apps || []);
    if (apps.length === 0) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const rawKey = process.env.FIREBASE_PRIVATE_KEY;
        const privateKey = rawKey ? rawKey.replace(/\\n/g, '\n') : undefined;

        const isPlaceholder = !projectId || projectId === 'YOUR_FIREBASE_PROJECT_ID';

        if (isPlaceholder || !clientEmail || !privateKey) {
            console.warn(
                '[firebase-admin] Firebase credentials not configured. ' +
                'Fill in root .env to enable Firestore/Auth features. ' +
                'Server will run in local-only mode.'
            );
        } else {
            admin.initializeApp({
                credential: admin.cert({ projectId, clientEmail, privateKey }),
            });
            console.log('[firebase-admin] Initialized successfully. Project:', projectId);
            db = getFirestore();
            adminAuth = getAuth();
        }
    } else {
        const { getFirestore } = require('firebase-admin/firestore');
        const { getAuth } = require('firebase-admin/auth');
        db = getFirestore();
        adminAuth = getAuth();
    }
} catch (e) {
    console.warn('[firebase-admin] Failed to load firebase-admin:', e.message);
    console.warn('[firebase-admin] Install with: npm install firebase-admin --save');
}

module.exports = { db, adminAuth, admin };