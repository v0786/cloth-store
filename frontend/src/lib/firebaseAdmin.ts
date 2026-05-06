import admin from "firebase-admin";

let app: admin.app.App | null = null;

function getServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed as admin.ServiceAccount;
  } catch {
    return null;
  }
}

export function getFirebaseAdminApp() {
  if (app) return app;
  const serviceAccount = getServiceAccountFromEnv();
  if (serviceAccount) {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return app;
  }

  app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  return app;
}

export function getFirestore() {
  const a = getFirebaseAdminApp();
  return a.firestore();
}

export function isFirestoreConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS);
}
