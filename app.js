// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js ";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js ";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js ";

// Your Firebase config (replace with your own)
const firebaseConfig = {
  apiKey: "AIzaSyDxkqvF9P2a_shBOaeMUZ0VDm13GJVy55M",
  authDomain: "calorietracker-da726.firebaseapp.com",
  projectId: "calorietracker-da726",
  storageBucket: "calorietracker-da726.appspot.com",
  messagingSenderId: "95055835989",
  appId: "1:95055835989:web:d35f665b955fc2fa3175dc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signup");
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const foodInput = document.getElementById("food");
const addFoodBtn = document.getElementById("addFood");
const foodList = document.getElementById("foodList");
const appSection = document.getElementById("app");
const calorieGoalInput = document.getElementById("calorieGoal");
const saveGoalBtn = document.getElementById("saveGoal");
const calorieProgressSpan = document.getElementById("calorieProgress");
const goalValueSpan = document.getElementById("goalValue");
const progressBar = document.getElementById("goalProgressBar");

// Mock Food Database
const mockFoodDatabase = {
  apple: { name: "Apple", calories: 52, protein: 0.3, fat: 0.2, carbs: 14 },
  banana: { name: "Banana", calories: 89, protein: 1.1, fat: 0.3, carbs: 23 },
  rice: { name: "White Rice (cooked)", calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  chicken: { name: "Chicken Breast", calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  egg: { name: "Boiled Egg", calories: 70, protein: 6, fat: 5, carbs: 0.6 },
  bread: { name: "Whole Wheat Bread", calories: 69, protein: 4, fat: 1, carbs: 12 },
  milk: { name: "Milk (1 cup)", calories: 149, protein: 8, fat: 8, carbs: 12 },
  yogurt: { name: "Plain Yogurt", calories: 59, protein: 10, fat: 0.4, carbs: 3.6 },
  potato: { name: "Baked Potato", calories: 110, protein: 3, fat: 0, carbs: 26 },
  salmon: { name: "Salmon (grilled)", calories: 208, protein: 17, fat: 15, carbs: 0 },
  broccoli: { name: "Broccoli (steamed)", calories: 27, protein: 2.4, fat: 0.3, carbs: 4.6 }
};

let currentUser = null;
let totalCalories = 0;
let calorieGoal = 0;

// Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    appSection.classList.remove("hidden");
    logoutBtn.style.display = "inline-block";
    loadFoods(user.uid);
    updateProgress();
  } else {
    currentUser = null;
    appSection.classList.add("hidden");
    logoutBtn.style.display = "none";
    foodList.innerHTML = "";
    totalCalories = 0;
    updateProgress();
  }
});

// Sign Up
signupBtn.addEventListener("click", () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("✅ Account created successfully!");
    })
    .catch((error) => {
      if (error.code === "auth/email-already-in-use") {
        alert("This email is already in use. Try logging in instead.");
      } else {
        alert("Failed to create account: " + error.message);
      }
    });
});

// Log In
loginBtn.addEventListener("click", () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .catch((error) => {
      if (error.code === "auth/user-not-found") {
        alert("No account found with this email. Please sign up first.");
      } else if (error.code === "auth/wrong-password") {
        alert("Incorrect password. Please try again.");
      } else {
        alert("Login failed: " + error.message);
      }
    });
});

// Log Out
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    alert("👋 Logged out successfully.");
  }).catch((error) => {
    alert("Logout failed: " + error.message);
  });
});

// Search mock database for food
function findMockFood(foodName) {
  const lowerCaseName = foodName.toLowerCase().trim();

  // Exact match
  if (mockFoodDatabase[lowerCaseName]) {
    return mockFoodDatabase[lowerCaseName];
  }

  // Partial match
  for (let key in mockFoodDatabase) {
    if (key.includes(lowerCaseName)) {
      return mockFoodDatabase[key];
    }
  }

  return null;
}

// Add Food Entry
addFoodBtn.addEventListener("click", async () => {
  const foodName = foodInput.value.trim();
  if (!foodName) {
    alert("Please enter a valid food name.");
    return;
  }

  if (!currentUser) {
    alert("You must be logged in to add food.");
    return;
  }

  const nutrition = findMockFood(foodName);
  if (!nutrition) {
    alert(`Could not find "${foodName}" in the food database.`);
    return;
  }

  try {
    await addDoc(collection(db, "foods"), {
      uid: currentUser.uid,
      name: nutrition.name,
      calories: nutrition.calories,
      protein: nutrition.protein,
      fat: nutrition.fat,
      carbs: nutrition.carbs,
      date: new Date().toISOString().split("T")[0]
    });

    foodInput.value = "";
    await loadFoods(currentUser.uid);
    updateProgress();
  } catch (error) {
    console.error("Error saving food:", error);
    alert("Failed to save food entry.");
  }
});

// Load food entries from Firestore
async function loadFoods(uid) {
  const today = new Date().toISOString().split("T")[0];
  const q = query(
    collection(db, "foods"),
    where("uid", "==", uid),
    where("date", "==", today)
  );

  try {
    const snapshot = await getDocs(q);
    foodList.innerHTML = "";

    let total = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      total += data.calories;

      const li = document.createElement("li");
      li.textContent = `${data.name}: ${data.calories} cal | P: ${data.protein}g, F: ${data.fat}g, C: ${data.carbs}g`;
      foodList.appendChild(li);
    });

    totalCalories = total;
  } catch (error) {
    console.error("Error loading foods:", error);
    alert("Failed to load your food entries.");
  }
}

// Save daily calorie goal
saveGoalBtn.addEventListener("click", () => {
  const goal = parseInt(calorieGoalInput.value);
  if (isNaN(goal) || goal <= 0) {
    alert("Please enter a valid calorie goal.");
    return;
  }

  calorieGoal = goal;
  updateProgress();
  calorieGoalInput.value = "";
});

// Update progress bar and calorie display
function updateProgress() {
  calorieProgressSpan.textContent = totalCalories;
  goalValueSpan.textContent = calorieGoal;

  const percent = calorieGoal ? Math.min((totalCalories / calorieGoal) * 100, 100) : 0;
  progressBar.value = percent;
}