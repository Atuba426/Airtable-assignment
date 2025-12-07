import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";

dotenv.config();

connectDB();

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
if (process.env.FRONTEND_URL) {
 
  app.use(
    cors({
      origin: "*",
      credentials: true,
    })
  );
}

app.use(
  session({
    secret: process.env.SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure:
        process.env.CROSS_SITE_COOKIES === "true" ||
        process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.CROSS_SITE_COOKIES === "true" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// Routes
import authRoutes from "./routes/authRoutes.js";
import createFormRoutes from "./routes/createFormRoutes.js";
import supportedRoutes from "./routes/supportedRoutes.js";

app.use("/api/auth/airtable", authRoutes);
app.use("/api/airtable", createFormRoutes);
app.use("/api", supportedRoutes);

const PORT = process.env.PORT || 5000;
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});


app.listen(PORT, () =>
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);
