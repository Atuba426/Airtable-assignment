import express from "express";
import {
  getBases,
  getFormById,
  getFields,
  getTables,
  createForm,
  getAllForms,
} from "../controllers/createFormController.js";
const router = express.Router();

router.get("/bases", getBases);
router.get("/tables", getTables);
router.get("/:baseId/:tableId/fields", getFields);
router.get("/get-forms",getAllForms);
router.post("/forms", createForm);
router.get("/forms/:formId", getFormById);
export default router;
    