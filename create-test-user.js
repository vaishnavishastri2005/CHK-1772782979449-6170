/**
 * create-test-user.js — creates Firebase user via Admin SDK
 */
process.env.GOOGLE_APPLICATION_CREDENTIALS = undefined; // clear any env conflicts

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Fresh init with unique name
const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
}, 'rakshak-user-creator-' + Date.now());

async function run() {
    try {
        console.log('\n🔄  Connecting to Firebase...');

        const userRecord = await app.auth().createUser({
            email: 'ameetmurme3@gmail.com',
            password: 'ameet@1234',
            displayName: 'Ameet Murme',
            emailVerified: true
        });

        console.log('\n✅  User created successfully!');
        console.log('────────────────────────────────────────');
        console.log('  📧  Email    :', userRecord.email);
        console.log('  👤  Name     :', userRecord.displayName);
        console.log('  🆔  UID      :', userRecord.uid);
        console.log('────────────────────────────────────────');
        console.log('\n👉  Login at: http://localhost:3000/index.html');
        console.log('  📧  ameetmurme3@gmail.com');
        console.log('  🔑  ameet@1234\n');

    } catch (err) {
        if (err.code === 'auth/email-already-exists') {
            console.log('\n✅  Account already exists! Just use these credentials:');
            console.log('────────────────────────────────────────');
            console.log('  📧  Email    : ameetmurme3@gmail.com');
            console.log('  🔑  Password : ameet@1234');
            console.log('────────────────────────────────────────');
            console.log('\n👉  Login at: http://localhost:3000/index.html\n');
        } else {
            console.error('\n❌  Full error:', JSON.stringify(err, null, 2));
        }
    } finally {
        await app.delete();
        process.exit(0);
    }
}

run();
