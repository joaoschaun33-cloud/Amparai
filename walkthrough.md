# Migration Walkthrough — Amparai to Google Cloud & Firebase

We have successfully migrated the Amparai app architecture from the mock/Emergent environment to a fully independent, production-ready stack in Google Cloud and Firebase, strictly adhering to all LGPD data sovereignty and security guidelines.

---

## 🚀 Accomplishments

### 1. Google Cloud & Firebase Project Setup (Phase 1)
- Verified active billing and enabled all core APIs (`run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `cloudbilling.googleapis.com`).
- Initialized a Firestore database in native mode in the **São Paulo region (`southamerica-east1`)** to fulfill LGPD health-data local storage requirements.
- Configured a dedicated `amparai-backend` Service Account in GCP and assigned it the following IAM roles:
  - `roles/datastore.user` (Firestore Access)
  - `roles/secretmanager.secretAccessor` (Secret Manager Access)
  - `roles/firebaseauth.admin` (Firebase User Management)
- Created the main Firebase Web App config inside Firebase Project `amparai-ce7f4`.

### 2. Stateless Authentication & Decoupled Frontend (Phase 2)
- Installed the official `firebase` package on the frontend and created `@/src/utils/firebase.ts` to initialize the client SDK on both Web and React Native/Expo.
- Rewrote `AuthContext.tsx` to handle authentication using the Firebase Client SDK:
  - **Web**: Uses `signInWithPopup` with `GoogleAuthProvider` for native Google Login popup.
  - **Native/Expo Go**: Dynamically logs in using a pre-created Firebase Auth test user (`demo@amparai.com.br` / `demo123456`) mapping to the local regression testing user ID (`user_test123`) to ensure frictionless Expo Go debugging.
  - Monitors credentials automatically via `onAuthStateChanged`.
- Rewrote the FastAPI backend to verify incoming JWT ID tokens in the Authorization headers statelessly using the `firebase-admin` SDK.

### 3. Serverless Data Layer & Firestore Migration (Phase 3)
- Substituted the legacy MongoDB Motor driver with `google-cloud-firestore`'s asynchronous client (`AsyncClient`), reading/writing directly to our São Paulo database.
- Implemented a robust `FirestoreDbClient` wrapper that emulates MongoDB database/collection patterns.
- **Composite Index Bypass**: Shifted the sorting (`.sort()`) and pagination (`.limit()`) queries from the Firestore query-builder to **in-memory sorting in Python**. This eliminates the requirement to pre-create composite indexes in the Firebase Console, allowing the application to work out-of-the-box on any new Firestore database instance.
- Verified that the backend successfully passes the entire regression test suite (**43/43 tests passing**).

### 4. Containerization & Cloud Run Deployment (Phase 4)
- Created a production-ready `Dockerfile` and a `.gcloudignore` config to optimize source builds.
- Migrated legacy `litellm` wheels and private package requirements to public, compatible PyPI packages in `requirements.txt`.
- Configured default Cloud Build/Compute service accounts IAM permissions with `roles/storage.admin`.
- Built and deployed the FastAPI container directly via Google Cloud Build to Cloud Run in São Paulo:
  - **Service URL**: `https://amparai-backend-750186946997.southamerica-east1.run.app`

### 5. Google Product Suite Integration (Phase 5)
- Replaced legacy Emergent integrations (Claude/OpenAI via custom libraries) with the official **Google GenAI Python SDK (`google-genai`)** using **Gemini 2.5 Flash** for:
  - Weekly summary generations (`/api/summary/weekly`).
  - Multimodal receipt OCR extraction (`/api/ocr/receipt`) with native JSON structured output configurations.
- Pointed the frontend `.env` to hit the new Cloud Run URL.

### 6. Public Wristband Security (Phase 6)
- Created a secure `firestore.rules` configuration file in the project root enforcing a strict **deny-all policy** (`allow read, write: if false;`) for direct client access.
- Deployed rules successfully to Firebase, ensuring all Firestore queries must pass through our FastAPI backend Admin SDK.
- Confirmed that the public wristband route `/pulseira/[id]` remains public and functions without requiring authentication.

---

## 🛠️ Verification & Test Results

### 1. Backend Integration Tests
Executed the complete test suite against the FastAPI server running locally and communicating directly with our production Firestore:
```bash
======================= 43 passed in 108.73s (0:01:48) ========================
```

### 2. Frontend Login & Auth Flow
Using the browser automation agent, we navigated to `http://localhost:8081` (Metro web server) and clicked **"Entrar com Google"**.
- Confirmed that the Firebase SDK successfully opens the Google Authentication popup dialog.
- Verified that no client SDK initialization errors or `auth/argument-error` messages are thrown.
