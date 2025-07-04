// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // ✅ Correct import

const firebaseConfig = {
  apiKey: "AIzaSyBqEOvUTGWra3ImEksWIls3eX0M6gerQKc",
  authDomain: "helpmate-fcf53.firebaseapp.com",
  projectId: "helpmate-fcf53",
  storageBucket: "helpmate-fcf53.firebasestorage.app",
  messagingSenderId: "1026300288233",
  appId: "1:1026300288233:web:fea3c7496ca4a752dce478",
  measurementId: "G-7TNWPKJTDF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
