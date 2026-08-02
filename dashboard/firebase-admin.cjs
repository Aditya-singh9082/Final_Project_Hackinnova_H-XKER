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
        const fs = require('fs');
        const rootDir = path.join(__dirname, '..');
        const serviceAccountFiles = fs.readdirSync(rootDir).filter(f => f.includes('firebase-adminsdk') && f.endsWith('.json'));
        let creds = null;
        if (serviceAccountFiles.length > 0) {
            const serviceAccountPath = path.join(rootDir, serviceAccountFiles[0]);
            creds = admin.cert(require(serviceAccountPath));
            console.log('[firebase-admin] Loaded credentials from service account file:', serviceAccountFiles[0]);
        } else {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const rawKey = process.env.FIREBASE_PRIVATE_KEY;
            // Remove leading/trailing quotes that some platforms might add, then replace escaped newlines
            const privateKey = rawKey ? rawKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n') : undefined;
            if (projectId && clientEmail && privateKey && projectId !== 'YOUR_FIREBASE_PROJECT_ID') {
                creds = admin.cert({ projectId, clientEmail, privateKey });
                console.log('[firebase-admin] Loaded credentials from environment variables.');
            }
        }

        if (creds) {
            admin.initializeApp({
                credential: creds,
            });
            console.log('[firebase-admin] Initialized successfully.');
            db = getFirestore();
            adminAuth = getAuth();
        } else {
            console.warn('[firebase-admin] Firebase credentials not configured. Fill in root .env or add a service account json file.');
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