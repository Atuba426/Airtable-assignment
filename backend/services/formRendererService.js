import { getVisibleFields } from "./conditionalLogicService.js";

export const SUPPORTED_TYPES = [
  "short_text",
  "long_text",
  "single_select",
  "multi_select",
  "attachment",
];

export const generateFormSchema = (form) => {
  return {
    id: form._id,
    title: form.title,
    fields: form.fields.map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      required: f.required,
      options: f.options,
      visibleIf: f.conditionalRules || null,
    })),
  };
};

export const validateSubmission = (form, submission) => {
  const errors = [];
  const visibleFields = getVisibleFields(form.fields, submission);

  visibleFields.forEach((field) => {
    const value = submission[field.id];

    if (field.required && (value === undefined || value === "")) {
      errors.push(`${field.label} is required`);
    }

    if (
      field.type === "single_select" &&
      value &&
      !field.options.includes(value)
    ) {
      errors.push(`${field.label} has invalid option`);
    }

    if (field.type === "multi_select" && value && Array.isArray(value)) {
      const invalid = value.filter((v) => !field.options.includes(v));
      if (invalid.length > 0) {
        errors.push(
          `${field.label} has invalid multi-select options: ${invalid.join(
            ", "
          )}`
        );
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default {validateSubmission, generateFormSchema};
