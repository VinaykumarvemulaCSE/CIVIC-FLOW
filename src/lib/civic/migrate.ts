import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getComplaints, getIssues } from "./store";

export async function uploadSeedDataToFirestore() {
  if (!db) {
    alert("Firebase is not configured. Add the VITE_FIREBASE_* keys to .env first.");
    return;
  }
  const firestore = db;
  console.log("Starting Firestore migration...");

  try {
    // 1. Upload Complaints
    const complaints = getComplaints();
    for (const c of complaints) {
      const docRef = doc(collection(firestore, "complaints"), c.ticket);
      await setDoc(docRef, c);
    }
    console.log(`✅ Uploaded ${complaints.length} complaints.`);

    // 2. Upload Issues
    const issues = getIssues();
    for (const i of issues) {
      const docRef = doc(collection(firestore, "issues"), i.issueId);
      await setDoc(docRef, i);
    }
    console.log(`✅ Uploaded ${issues.length} issues.`);

    // 3. Upload Users
    const { getUsers } = await import("./users");
    const users = getUsers();
    for (const u of users) {
      const docRef = doc(collection(firestore, "users"), u.id);
      await setDoc(docRef, u);
    }
    console.log(`✅ Uploaded ${users.length} users.`);

    // 3. Upload Logs
    const storedState = window.localStorage.getItem("civictriage.state.v3");
    if (storedState) {
      const state = JSON.parse(storedState);
      
      const logs = state.logs || [];
      for (const [index, log] of logs.entries()) {
        const docRef = doc(collection(firestore, "logs"), `log-${index}-${log.at}`);
        await setDoc(docRef, log);
      }
      console.log(`✅ Uploaded ${logs.length} logs.`);

      const audit = state.audit || [];
      for (const [index, a] of audit.entries()) {
        const docRef = doc(collection(firestore, "audit"), `audit-${index}-${a.at}`);
        await setDoc(docRef, a);
      }
      console.log(`✅ Uploaded ${audit.length} audit records.`);
    }

    alert("Migration Complete! Check your Firebase Console.");
  } catch (error) {
    console.error("Migration failed:", error);
    alert("Migration failed. Check the console.");
  }
}
