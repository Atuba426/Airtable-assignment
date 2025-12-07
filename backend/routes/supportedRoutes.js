import express from "express";
import {
  submitForm,
  listResponses,
  airtableWebhook,
} from "../controllers/supportedController.js";
const router = express.Router();
router.post("/forms/:formId/submit", submitForm);
router.get("/forms/:formId/responses", listResponses);
router.post("/webhooks/airtable", airtableWebhook);

export default router;
