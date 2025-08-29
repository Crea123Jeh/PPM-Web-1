// firebaseConfig.js
const firebaseConfig = {
  apiKey: "AIzaSyDesT-ZOX0b3Vlaj8Ts7SYPotHV-6Yh1Lg",
  authDomain: "ppm-server-23bae.firebaseapp.com",
  projectId: "ppm-server-23bae",
  storageBucket: "ppm-server-23bae.appspot.com",
  databaseURL: "https://ppm-server-23bae-default-rtdb.firebaseio.com",
  messagingSenderId: "499971564114",
  appId: "1:499971564114:web:817c1ab6075531c26ff58b",
  measurementId: "G-492288554"
};

if (!window.firebase || !firebase.apps?.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
