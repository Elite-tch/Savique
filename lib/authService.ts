import { auth } from "./firebase";
import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User
} from "firebase/auth";

export const loginAdmin = async (email: string, pass: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        return userCredential.user;
    } catch (error: any) {
        throw new Error(error.message);
    }
};

export const logoutAdmin = async () => {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Logout failed", error);
    }
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};
