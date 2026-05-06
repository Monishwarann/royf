import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, db, rtdb } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, set, get } from 'firebase/database';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, name) {
    console.log("Signup started for:", email);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User created successfully:", result.user.uid);
      
      // Update profile with name
      console.log("Updating profile...");
      await updateProfile(result.user, { displayName: name });
      console.log("Profile updated.");
      
      const userData = {
        name: name,
        email: email,
        allergies: [],
        conditions: [],
        diet: 'none',
        createdAt: new Date().toISOString()
      };

      // Initialize user data in Firestore
      console.log("Saving to Firestore...");
      try {
        await setDoc(doc(db, "users", result.user.uid), userData);
        console.log("Firestore data saved.");
      } catch (fsError) {
        console.error("Firestore Error:", fsError);
        // Continue even if Firestore fails for now
      }
      
      // Initialize user data in Realtime Database
      console.log("Saving to Realtime Database...");
      try {
        await set(ref(rtdb, "users/" + result.user.uid), userData);
        console.log("RTDB data saved.");
      } catch (rtdbError) {
        console.error("RTDB Error:", rtdbError);
        // Continue even if RTDB fails for now
      }
      
      return result;
    } catch (error) {
      console.error("Signup Error:", error);
      throw error;
    }
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function googleLogin() {
    console.log("Google Login: Attempting Popup...");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google Login: Popup success", result.user.email);
      await handleNewUser(result.user);
      return result;
    } catch (error) {
      console.warn("Google Login: Popup failed/blocked", error.code);
      
      // Handle cases where redirect is necessary
      if (
        error.code === 'auth/popup-blocked' || 
        error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/operation-not-supported-in-this-environment' ||
        error.message.includes('cross-origin')
      ) {
        console.log("Google Login: Attempting Redirect...");
        try {
          return await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          console.error("Google Login: Redirect failed", redirectError);
          throw redirectError;
        }
      }
      
      // If it's an unauthorized domain error, warn the user
      if (error.code === 'auth/unauthorized-domain') {
        alert("Domain not authorized! Please add 'localhost' to your Firebase Console under Authentication -> Settings -> Authorized Domains.");
      }
      
      throw error;
    }
  }

  async function handleNewUser(user) {
    console.log("Checking if user exists in database...", user.uid);
    try {
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists()) {
        console.log("New user detected, initializing data...");
        const userData = {
          name: user.displayName,
          email: user.email,
          phoneNumber: user.phoneNumber || "",
          allergies: [],
          conditions: [],
          diet: 'none',
          createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, "users", user.uid), userData);
        await set(ref(rtdb, "users/" + user.uid), userData);
        console.log("New user data initialized in DBs.");
      } else {
        console.log("Existing user found in DB.");
      }
    } catch (dbError) {
      console.error("Database sync error during Google Login:", dbError);
    }
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  useEffect(() => {
    // Check for redirect result on mount
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log("Google Login (Redirect) successful:", result.user.email);
          await handleNewUser(result.user);
        }
      } catch (error) {
        console.error("Redirect Login Error:", error);
      }
    };
    checkRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Initial basic user data to allow immediate rendering
        const baseUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || "User",
          phoneNumber: firebaseUser.phoneNumber || "",
          allergies: [],
          conditions: [],
          diet: 'none'
        };
        
        setCurrentUser(baseUser);
        setLoading(false);

        // Fetch additional data from Firestore without blocking the UI
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const extraData = userDoc.data();
            setCurrentUser(prev => ({
              ...prev,
              name: extraData.name || prev.name,
              phoneNumber: extraData.phoneNumber || prev.phoneNumber || "",
              allergies: extraData.allergies || [],
              conditions: extraData.conditions || [],
              diet: extraData.diet || 'none'
            }));
          }
        } catch (err) {
          console.warn("Firestore data unavailable (offline or denied):", err.message);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function updateUserData(updates) {
    if (!currentUser) return;
    
    const newUserData = { ...currentUser, ...updates };
    
    try {
      // Optimistic update
      setCurrentUser(newUserData);
      
      // Persist to DB - exclude non-serializable fields if any, but spreading updates is generally fine for Firestore merge
      await setDoc(doc(db, "users", currentUser.uid), updates, { merge: true });
      
      // For RTDB, we might want to update specific fields
      await set(ref(rtdb, "users/" + currentUser.uid), newUserData);
    } catch (err) {
      console.error("Error updating user data:", err);
      // Revert if needed or handle error
      throw err;
    }
  }

  const value = {
    currentUser,
    login,
    signup,
    logout,
    resetPassword,
    googleLogin,
    updateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
