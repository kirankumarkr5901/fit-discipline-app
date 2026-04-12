# 🔥 Fit-Disciple

Your personal fitness companion — plan workouts, track progress, build habits, and earn rewards.

## Features

- **Home Dashboard** — today's stats, active streaks, recent activity
- **Planner** — create workout plans with custom day names, manage habits with custom point values
- **Workout Tracker** — log sets/reps/weight, day tabs, muscle group filters, PR tracking, progress charts
- **Run Tracker** — log distance/time, auto pace calculation, PR ranking (1st/2nd/3rd bonuses), dual-axis chart
- **Habits** — daily checklist, streaks, consistency & dedication bonuses, strict penalties, positive/negative actions, points log
- **Rewards** — micro (daily), weekly & monthly rewards, claim with discipline points, add/reset points
- **Discipline Points Engine** — earn points through habits, workouts, runs & actions; spend on rewards

## Tech Stack

- Pure HTML / CSS / JavaScript (no frameworks)
- Firebase Authentication (Google Sign-In)
- Cloud Firestore (real-time database)
- Chart.js for progress charts
- Mobile-first responsive design with dark mode

## Setup

1. Clone the repo
2. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
3. Register a Web App and copy the config into `js/firebase-config.js`
4. Enable **Google Sign-In** in Authentication → Sign-in method
5. Create a **Firestore Database** in test mode
6. Add Firestore security rules:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
7. Deploy to GitHub Pages or serve locally:
   ```
   python -m http.server 8080
   ```

## Project Structure

```
fit-disciple/
├── index.html
├── css/
│   ├── base.css          # Variables, reset, dark mode
│   ├── layout.css         # Nav, responsive, mobile overlay
│   ├── components.css     # Buttons, forms, modals, tabs, tables, charts
│   ├── auth.css           # Login page, loading screen, user profile
│   ├── home.css           # Hero, dashboard, shortcuts, activity
│   ├── planner.css        # Plan cards, day headers, habit cards
│   ├── workout-tracker.css # Day tabs, tracker cards, PR display
│   ├── run-tracker.css    # Run stats grid
│   ├── habits.css         # Habit checklist, DP display, bonuses
│   └── rewards.css        # Reward cards
├── js/
│   ├── firebase-config.js # Firebase initialization
│   ├── data.js            # In-memory cache + Firestore sync
│   ├── auth.js            # Google Sign-In, auth state
│   ├── app.js             # Navigation, dark mode, toast, modals
│   ├── home.js            # Home dashboard
│   ├── planner.js         # Workout plans & habit management
│   ├── workout-tracker.js # Workout logging, PRs, charts
│   ├── run-tracker.js     # Run logging, pace, charts
│   ├── habits.js          # Daily habits, streaks, actions
│   └── rewards.js         # Rewards, claim, add/reset points
└── ReadMe.md
```

## License

MIT
