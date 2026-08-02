const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

async function main() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;
    const scanId = process.env.SCAN_ID;
    const targetRepo = process.env.TARGET_REPO;

    if (!projectId || !clientEmail || !rawKey || !scanId) {
        console.error('Missing required environment variables for Firebase upload.');
        process.exit(1);
    }

    // Parse private key correctly
    const privateKey = rawKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
        })
    });

    const db = admin.firestore();

    try {
        let runState = {};
        let qualityReport = {};

        const statePath = path.join(__dirname, 'run_state.json');
        if (fs.existsSync(statePath)) {
            runState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        }

        const reportPath = path.join(__dirname, 'code_quality_report.json');
        if (fs.existsSync(reportPath)) {
            qualityReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        }

        // Finalize state
        runState.status = 'completed';
        runState.completedAt = new Date().toISOString();

        await db.collection('scans').doc(scanId).set({
            repoUrl: targetRepo,
            runState: runState,
            qualityReport: qualityReport,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`Successfully uploaded scan results to Firestore for scan ID: ${scanId}`);
    } catch (e) {
        console.error('Failed to upload results to Firestore:', e);
        process.exit(1);
    }
}

main();
