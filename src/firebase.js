import firebase from "firebase/app";
import "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBLT2admOYMRpDN5H6YeaNBjAhmVMTU2yg",
  authDomain: "omnichat-3c607.firebaseapp.com",
  projectId: "omnichat-3c607",
  storageBucket: "omnichat-3c607.firebasestorage.app",
  messagingSenderId: "1034706452554",
  appId: "1:1034706452554:web:b5200ec0cfa682824e26b3"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export default firebase;