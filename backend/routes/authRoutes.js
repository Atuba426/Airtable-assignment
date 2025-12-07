import express from "express";
import { airtablelogin, callback, me } from "../controllers/authController.js";

const router = express.Router();

router.get("/login", airtablelogin);
router.get("/callback", callback);
router.get("/me", me);

export default router;
