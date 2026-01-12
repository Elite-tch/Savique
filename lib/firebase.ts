import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAfEi08hYV7d-U7QZhO1PEv3HZUME83Ae8",
    authDomain: "project-61ecf.firebaseapp.com",
    projectId: "project-61ecf",
    storageBucket: "project-61ecf.firebasestorage.app",
    messagingSenderId: "263054069293",
    appId: "1:263054069293:web:cca30648df250b0227b2a4",
    measurementId: "G-N1R9WL2PM5"
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
