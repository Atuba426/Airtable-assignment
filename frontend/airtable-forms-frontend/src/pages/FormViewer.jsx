import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api.js";

const isVisible = (field, answers) => {
  const rule = field.visibleIf;
  if (!rule) return true;
  const val = answers[rule.questionId];
  if (rule.operator === "equals") return val === rule.value;
  if (rule.operator === "not_equals") return val !== rule.value;
  if (rule.operator === "includes")
    return Array.isArray(val) && val.includes(rule.value);
  return true;
};

export default function FormViewer() {
  const { slug } = useParams();
  const [schema, setSchema] = useState(null);
  const [answers, setAnswers] = useState({});
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState([]);
  const [attempted, setAttempted] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    document.title = "Form";
  }, []);
  useEffect(() => {
    api
      .get(`/forms/public/${slug}`)
      .then((r) => setSchema(r.data))
      .catch(() => {});
  }, [slug]);

  const visibleFields = useMemo(
    () => (schema?.fields || []).filter((f) => isVisible(f, answers)),
    [schema, answers]
  );

  const onChange = (field, value) => {
    setAnswers((prev) => ({ ...prev, [field.id]: value }));
  };

  const validateClient = () => {
    const err = [];
    for (const f of visibleFields) {
      if (f.type === "attachment") {
        if (f.required && !file) err.push(`${f.label} is required`);
        continue;
      }
      const v = answers[f.id];
      const isEmpty =
        v == null || v === "" || (Array.isArray(v) && v.length === 0);
      if (f.required && isEmpty) err.push(`${f.label} is required`);
    }
    return err;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!schema) return;

    setAttempted(true);

    // Client-side validation first
    const clientErrors = validateClient();
    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      setMessage("Please fix the highlighted issues.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setErrors([]);

    try {
      // Server-side validation (include attachment presence if visible)
      const validationPayload = { ...answers };
      (schema?.fields || [])
        .filter((f) => f.type === "attachment")
        .forEach((f) => {
          // send a truthy placeholder if user picked a file
          validationPayload[f.id] = file ? file.name || "has_file" : "";
        });
      const validationRes = await api.post(
        `/forms/${schema._id}/validate`,
        validationPayload
      );
      if (!validationRes.data?.isValid) {
        setErrors(validationRes.data?.errors || ["Validation failed"]);
        setSubmitting(false);
        return;
      }

      // Submit
      const formData = new FormData();
      Object.entries(answers).forEach(([k, v]) =>
        formData.append(k, Array.isArray(v) ? JSON.stringify(v) : v)
      );
      if (file) formData.append("attachment", file);

      await api.post(`/forms/public/${schema.slug}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Submitted successfully");
    } catch (e) {
      setMessage(e.response?.data?.error || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!schema) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">
          {schema.title || schema.slug}
        </h1>
        {!preview && (
          <form onSubmit={onSubmit} className="space-y-4">
            {visibleFields.map((f) => (
              <div key={f.id}>
                <label className="block mb-1 font-medium">
                  {f.label}
                  {f.required && <span className="text-red-600"> *</span>}
                </label>
                <FieldInput
                  field={f}
                  value={answers[f.id]}
                  onChange={onChange}
                  onPickFile={setFile}
                  attempted={attempted}
                  file={file}
                />
              </div>
            ))}
            {errors.length > 0 && (
              <ul className="text-sm text-red-600 list-disc pl-5">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
            {message && <div className="text-sm text-gray-700">{message}</div>}
            <div className="flex items-center gap-3">
              <button
                disabled={submitting}
                className="px-4 py-2 bg-black text-white rounded-md"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
              <button
                type="button"
                className="px-4 py-2 border rounded-md"
                onClick={() => setPreview(true)}
              >
                Preview
              </button>
            </div>
          </form>
        )}
        {preview && (
          <div className="space-y-4">
            {visibleFields.map((f) => (
              <div key={f.id} className="border rounded p-3">
                <div className="text-sm text-gray-500">{f.label}</div>
                <div className="mt-1 font-medium break-words">
                  {f.type === "attachment"
                    ? file?.name || "No file"
                    : Array.isArray(answers[f.id])
                    ? answers[f.id].join(", ") || "—"
                    : answers[f.id] || "—"}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 border rounded-md"
                onClick={() => setPreview(false)}
              >
                Back to Edit
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-black text-white rounded-md"
                onClick={onSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange, onPickFile, attempted, file }) {
  if (field.type === "short_text")
    return (
      <input
        className="border rounded p-2 w-full"
        value={value || ""}
        onChange={(e) => onChange(field, e.target.value)}
      />
    );
  if (field.type === "long_text")
    return (
      <textarea
        className="border rounded p-2 w-full"
        rows={4}
        value={value || ""}
        onChange={(e) => onChange(field, e.target.value)}
      />
    );
  if (field.type === "single_select") {
    if (field.renderAs === "radios") {
      return (
        <div className="grid gap-2">
          {field.options?.map((o) => (
            <label key={o} className="inline-flex items-center gap-2">
              <input
                type="radio"
                name={field.id}
                checked={value === o}
                onChange={() => onChange(field, o)}
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
      );
    }
    return (
      <select
        className="border rounded p-2 w-full"
        value={value || ""}
        onChange={(e) => onChange(field, e.target.value)}
      >
        <option value="">Select</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "multi_select") {
    if (field.renderAs === "checkboxes") {
      const arr = Array.isArray(value) ? value : [];
      const toggle = (option) => {
        const next = arr.includes(option)
          ? arr.filter((x) => x !== option)
          : [...arr, option];
        onChange(field, next);
      };
      return (
        <div className="grid gap-2">
          {field.options?.map((o) => (
            <label key={o} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={arr.includes(o)}
                onChange={() => toggle(o)}
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
      );
    }
    // Polished custom dropdown for multi-select
    return (
      <MultiSelectDropdown
        options={field.options || []}
        value={Array.isArray(value) ? value : []}
        placeholder="Select options"
        onChange={(next) => onChange(field, next)}
      />
    );
  }
  if (field.type === "attachment")
    return (
      <div>
        <input
          type="file"
          onChange={(e) => {
            const picked = e.target.files?.[0] || null;
            onPickFile(picked);
            // reflect presence for validation
            onChange(field, picked ? picked.name || "has_file" : "");
          }}
        />
        {attempted && field.required && !file && (
          <div className="mt-1 text-sm text-red-600">
            {field.label} is required
          </div>
        )}
      </div>
    );
  return null;
}

function MultiSelectDropdown({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const onClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = (opt) => {
    const has = value.includes(opt);
    const next = has ? value.filter((x) => x !== opt) : [...value, opt];
    onChange(next);
  };

  const label = value.length ? value.join(", ") : placeholder;

  const onTriggerKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((o) => !o);
    }
  };

  const onItemKey = (opt) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(opt);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        role="button"
        tabIndex={0}
        className="w-full border rounded p-2 text-left bg-white text-gray-900 hover:bg-gray-50 cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
      >
        <span className={value.length ? "" : "text-gray-500"}>{label}</span>
        <span className="float-right text-gray-500">▾</span>
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-md max-h-56 overflow-auto">
          {options.map((opt) => {
            const checked = value.includes(opt);
            return (
              <div
                key={opt}
                role="option"
                aria-selected={checked}
                tabIndex={0}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                  checked ? "bg-gray-50" : ""
                }`}
                onClick={() => toggle(opt)}
                onKeyDown={onItemKey(opt)}
              >
                <span className="mr-2 inline-block w-4">
                  {checked ? "✓" : ""}
                </span>
                <span className="text-gray-900">{opt}</span>
              </div>
            );
          })}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">No options</div>
          )}
        </div>
      )}
    </div>
  );
}
