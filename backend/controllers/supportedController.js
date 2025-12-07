import Form from "../models/Form.js";
import Submission from "../models/Submission.js";
import airtableService from "../services/airtableService.js";
import conditionalLogicService from "../services/conditionalLogicService.js";
import formRendererService from "../services/formRendererService.js";
import User from "../models/User.js";

const SUPPORTED_TYPES = [
  "short_text",
  "long_text",
  "single_select",
  "multi_select",
  "attachment",
];

export function shouldShowQuestion(rules, answersSoFar) {
  if (!rules) return true;

  const { logic, conditions } = rules;

  if (!Array.isArray(conditions) || conditions.length === 0) return true;

  const evaluateSingle = (condition) => {
    const userValue = answersSoFar[condition.questionKey];

    switch (condition.operator) {
      case "equals":
        return userValue === condition.value;

      case "notEquals":
        return userValue !== condition.value;

      case "contains":
        if (Array.isArray(userValue))
          return userValue.includes(condition.value);
        return String(userValue || "").includes(String(condition.value));

      default:
        return true;
    }
  };

  return logic === "AND"
    ? conditions.every(evaluateSingle)
    : conditions.some(evaluateSingle);
}

export const createForm = async (req, res) => {
  try {
    const { title, baseId, tableId, fields } = req.body;

    for (const f of fields) {
      if (!SUPPORTED_TYPES.includes(f.type)) {
        return res.status(400).json({
          error: `Unsupported field type: ${
            f.type
          }. Allowed: ${SUPPORTED_TYPES.join(", ")}`,
        });
      }
    }

    const form = await Form.create({ title, baseId, tableId, fields });

    res.status(201).json({ message: "Form created", form });
  } catch (error) {
    console.error("Form creation error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Form with this slug already exists",
        slug: req.body.slug,
      });
    }
    res.status(500).json({ error: "Failed to create form" });
  }
};

export const getFormById = async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);

    if (!form) return res.status(404).json({ error: "Form not found" });

    const schema = formRendererService.generateFormSchema(form, true);

    res.json(schema);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const submitForm = async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form) return res.status(404).json({ error: "Form not found" });

    const submission = req.body;

    const visibleFields = form.fields.filter((q) =>
      shouldShowQuestion(q.conditionalRules || null, submission)
    );

    const errors = [];

    for (const field of visibleFields) {
      const value = submission[field.id];

      if (field.required && (value === undefined || value === "")) {
        errors.push(`${field.label} is required`);
      }

      if (field.type === "single_select") {
        if (value && !field.options.includes(value)) {
          errors.push(`Invalid option for ${field.label}`);
        }
      }

      if (field.type === "multi_select") {
        if (value && Array.isArray(value)) {
          const invalid = value.filter((v) => !field.options.includes(v));
          if (invalid.length > 0) {
            errors.push(`Invalid multi-select options: ${invalid.join(", ")}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Save submission
    const saved = await Submission.create({
      formId: form._id,
      airtableRecordId: "temp",
      answers: submission,
    });

    res.status(201).json({ message: "Submission saved", response: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const checkSubmitForm = async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form) return res.status(404).json({ error: "Form not found" });

    const submissionData = req.body;

    const visibleFields = form.fields.filter((field) =>
      shouldShowQuestion(field.conditionalRules || null, submissionData)
    );

    const errors = [];

    for (const field of visibleFields) {
      const value = submissionData[field.id];

      if (field.required && (value === undefined || value === "")) {
        errors.push(`${field.label} is required`);
      }

      if (field.type === "single_select" && value) {
        if (!field.options.includes(value)) {
          errors.push(`Invalid option for ${field.label}`);
        }
      }

      if (field.type === "multi_select" && value && Array.isArray(value)) {
        const invalid = value.filter((v) => !field.options.includes(v));
        if (invalid.length > 0) {
          errors.push(
            `Invalid multi-select options for ${field.label}: ${invalid.join(
              ", "
            )}`
          );
        }
      }
    }

    if (errors.length > 0) return res.status(400).json({ errors });

    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    if (!user.accessToken)
      return res
        .status(401)
        .json({
          error: "No Airtable access token. Please login with Airtable again",
        });

    const airtableFields = {};
    visibleFields.forEach((field) => {
      if (submissionData[field.id] !== undefined) {
        airtableFields[field.airtableFieldId] = submissionData[field.id];
      }
    });

    let airtableRecord = null;
    try {
      const airtableApi = airtableService(formOwner.accessToken);
      airtableRecord = await airtableApi.createRecord(
        form.baseId,
        form.tableId,
        airtableFields
      );
    } catch (err) {
      console.error("Airtable error:", err.message);
    }

    const savedSubmission = await Submission.create({
      formId: form._id,
      airtableRecordId: airtableRecord?.id || null,
      answers: submissionData,
    });

    res
      .status(201)
      .json({ message: "Submission saved", response: savedSubmission });
  } catch (err) {
    console.error("Submit form error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const listResponses = async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form) return res.status(404).json({ error: "Form not found" });

    const submissions = await Submission.find({ formId: form._id })
      .sort({ createdAt: -1 })
      .select("_id createdAt answers status deletedInAirtable");

    res.json({ responses: submissions });
  } catch (err) {
    console.error("List responses error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const airtableWebhook = async (req, res) => {
  try {
    const { type, record } = req.body;
    if (!record || !record.id)
      return res.status(400).json({ error: "Invalid webhook payload" });

    const submission = await Submission.findOne({
      airtableRecordId: record.id,
    });

    if (type === "record.updated") {
      if (submission) {
        submission.answers = record.fields;
        await submission.save();
      }
    }

    if (type === "record.deleted") {
      if (submission) {
        submission.deletedInAirtable = true;
        await submission.save();
      }
    }

    res.json({ message: "Webhook processed" });
  } catch (err) {
    console.error("Airtable webhook error:", err);
    res.status(500).json({ error: err.message });
  }
};
