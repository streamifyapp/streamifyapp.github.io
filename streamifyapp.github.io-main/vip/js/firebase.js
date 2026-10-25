import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, remove, push, onValue, onChildAdded, onChildChanged, query, orderByKey, limitToLast, endBefore, runTransaction, serverTimestamp, onDisconnect, goOnline, goOffline } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-storage.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-analytics.js";
import { CONFIG } from "./config.js";
export const app=initializeApp(CONFIG.FIREBASE);
export const auth=getAuth(app); export const db=getDatabase(app); export const storage=getStorage(app);
const goOnlineX=()=>goOnline(db),goOfflineX=()=>goOffline(db);
export const fb={goOnline:goOnlineX,goOffline:goOfflineX,ref,get,set,update,remove,push,onValue,onChildAdded,onChildChanged,query,orderByKey,limitToLast,endBefore,runTransaction,serverTimestamp,onDisconnect,storageRef,uploadBytes,getDownloadURL,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,onAuthStateChanged,setPersistence,browserLocalPersistence,browserSessionPersistence};
// Resolve persistence before allowing sign-in/sign-up so a fast submit cannot race it.
export const persistenceReady=setPersistence(auth,CONFIG.AUTH_PERSISTENCE==="local"?browserLocalPersistence:browserSessionPersistence).catch(err=>{console.warn("Auth persistence setup failed",err);});
isSupported().then(ok=>ok&&getAnalytics(app)).catch(()=>{});
