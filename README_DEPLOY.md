# Deployment Guide for JnanaSetu

This project is configured for deployment with **Netlify (Frontend)** and **Render (Backend)**.

## 1. Backend (Render)
The backend is located in the `/backend` directory.

### Environment Variables for Render:
- `MONGODB_URI`: Your MongoDB Atlas connection string.
- `GROQ_API_KEY`: Your Groq AI API key.
- `CORS_ORIGIN`: Your Netlify frontend URL (e.g., `https://jnanasetu.netlify.app`).
- `JWT_SECRET`: A random string for auth tokens.
- `NODE_ENV`: production

### Deployment Steps:
1. Push your code to GitHub.
2. In Render, click "New" -> "Web Service".
3. Select your repository.
4. Set the **Root Directory** to `backend`.
5. Set the **Environment** to `Node`.
6. Set the **Build Command** to `npm install`.
7. Set the **Start Command** to `npm start`.
8. Add the environment variables listed above in the "Advanced" section.
9. Deploy!

## 2. Frontend (Netlify)
The frontend is located in the `/frontend` directory.

### Environment Variables for Netlify:
- `VITE_BACKEND_URL`: Your Vercel backend URL (e.g., `https://jnanasetu-api.vercel.app`).
- `VITE_GROQ_API_KEY`: (If you call Groq directly from frontend, though backend is preferred).

### Deployment Steps:
1. In Netlify, click "Add new site" -> "Import an existing project".
2. Select your GitHub repository.
3. Set the **Base directory** to `frontend`.
4. Set the **Build command** to `npm run build`.
5. Set the **Publish directory** to `frontend/dist`.
6. Add the environment variables (especially `VITE_BACKEND_URL`).
7. Deploy!

## 3. Important Note on CORS
Ensure that `CORS_ORIGIN` in your Vercel backend matches your Netlify URL exactly (no trailing slash). This allows the frontend to securely communicate with the backend.
