import { useEffect, useMemo, useState } from "react";
import api from "../lib/api.js";
import { useNavigate, useParams } from "react-router-dom";

const SUPPORTED = [
  "singleLineText",
  "multilineText",
  "singleSelect",
  "multipleSelects",
  "multipleAttachments",
];

// CORRECTED: This is the ONLY default export for the Builder component.
export default function Builder() {
  const { formId } = useParams();
  const navigate = useNavigate();

  const [bases, setBases] = useState([]);
  const [tables, setTables] = useState([]);
  const [fields, setFields] = useState([]);

  const [selected, setSelected] = useState({ baseId: "", tableId: "" });

  const [form, setForm] = useState({
    title: "",
    fields: [],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Form Builder";
  }, []);

  // Load bases
  useEffect(() => {
    api
      .get("/api/airtable/bases")
      .then((r) => setBases(r.data?.bases || []))
      .catch(() => setBases([]));
  }, []);

  // Load form for editing
  useEffect(() => {
    if (!formId) return;
    api.get(`/forms/${formId}`).then((r) => {
      const f = r.data;
      setForm({
        title: f.title,
        fields: f.fields || [],
      });
      setSelected({ baseId: f.baseId, tableId: f.tableId });
    });
  }, [formId]);

  // Load tables when base changes
  useEffect(() => {
    if (!selected.baseId) return;
    api
      .get("/api/airtable/tables", {
        params: { baseId: selected.baseId },
      })
      .then((r) => setTables(r.data.tables || []));
  }, [selected.baseId]);

  // Load fields when table changes
  useEffect(() => {
    if (!selected.baseId || !selected.tableId) return;
    api
      .get(`/api/airtable/${selected.baseId}/${selected.tableId}/fields`)
      .then((r) => setFields(r.data.fields || []));
  }, [selected.baseId, selected.tableId]);

  const compatibleFields = useMemo(
    () => fields.filter((f) => SUPPORTED.includes(f.type)),
    [fields]
  );

  const toggleInclude = (airtableField) => {
    const exists = form.fields.find(
      (f) => f.airtableFieldId === airtableField.id
    );

    if (exists) {
      setForm((prev) => ({
        ...prev,
        fields: prev.fields.filter(
          (x) => x.airtableFieldId !== airtableField.id
        ),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          id: crypto.randomUUID(),
          questionKey: airtableField.id,
          label: airtableField.name,
          required: false,
          type: mapType(airtableField.type),
          airtableFieldId: airtableField.id,
          options: extractOptions(airtableField),
          visibleIf: null,
        },
      ],
    }));
  };

  const updateField = (id, patch) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.id === id ? { ...f, ...patch } : f
      ),
    }));
  };

  const save = async () => {
    if (!selected.baseId || !selected.tableId)
      return alert("Select base & table first!");

    setLoading(true);
    const payload = {
      ...form,
      baseId: selected.baseId,
      tableId: selected.tableId,
      
    };

    try {
      let r;
      if (formId) {
        r = await api.put(`/api/airtable/forms/${formId}`, payload);
      } else {
        r = await api.post("/api/airtable/forms", payload);
      }
      alert("Form saved successfully!");
    } catch (err) {
      alert(err.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        <div style={styles.grid}>
          {/* Left Column */}
          <section style={styles.card}>
            <h2 style={styles.heading}>Pick Base → Table</h2>

            <select
              style={styles.select}
              value={selected.baseId}
              onChange={(e) =>
                setSelected({ baseId: e.target.value, tableId: "" })
              }
            >
              <option value="">Select base</option>
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              style={styles.select}
              value={selected.tableId}
              onChange={(e) =>
                setSelected((s) => ({ ...s, tableId: e.target.value }))
              }
            >
              <option value="">Select table</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <div style={styles.formGroup}>
              <label style={styles.label}>Form Title</label>
              <input
                style={styles.input}
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
              />
            </div>
          </section>

          {/* Right Column */}
          <section style={styles.card}>
            <h2 style={styles.heading}>Fields</h2>

            {compatibleFields.map((f) => {
              const included = !!form.fields.find(
                (x) => x.airtableFieldId === f.id
              );
              const field = form.fields.find(
                (x) => x.airtableFieldId === f.id
              );

              return (
                <div key={f.id} style={styles.fieldCard}>
                  <div style={styles.fieldHeader}>
                    <div>
                      <div style={styles.fieldName}>{f.name}</div>
                      <div style={styles.fieldType}>{f.type}</div>
                    </div>

                    <button
                      style={{
                        ...styles.button,
                        backgroundColor: included ? "#dc2626" : "#000",
                      }}
                      onClick={() => toggleInclude(f)}
                    >
                      {included ? "Remove" : "Add"}
                    </button>
                  </div>

                  {included && (
                    <div style={styles.fieldContent}>
                      <input
                        style={styles.input}
                        value={field.label}
                        onChange={(e) =>
                          updateField(field.id, {
                            label: e.target.value,
                          })
                        }
                      />

                      <label style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateField(field.id, {
                              required: e.target.checked,
                            })
                          }
                        />
                        Required
                      </label>

                      {/* Conditional Logic */}
                      <RuleEditor
                        allFields={form.fields}
                        field={field}
                        onChange={(rule) =>
                          updateField(field.id, { visibleIf: rule })
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <div style={styles.saveContainer}>
            <button
              disabled={loading}
              onClick={save}
              style={{
                ...styles.button,
                backgroundColor: "#16a34a",
                padding: "12px 24px",
                fontSize: "16px",
              }}
            >
              {loading ? "Saving..." : formId ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapType(t) {
  if (t === "multilineText") return "long_text";
  if (t === "singleSelect") return "single_select";
  if (t === "multipleSelects") return "multi_select";
  if (t === "multipleAttachments") return "attachment";
  return "short_text";
}

function extractOptions(field) {
  if (
    field?.type === "singleSelect" ||
    field?.type === "multipleSelects"
  ) {
    return field.options?.choices?.map((c) => ({
      label: c.name,
      value: c.id,
    }));
  }
  return undefined;
}

function RuleEditor({ field, allFields, onChange }) {
  const otherFields = allFields.filter((f) => f.id !== field.id);

  const setRule = (patch) => {
    onChange({
      ...(field.visibleIf || {
        questionKey: "",
        operator: "equals",
        value: "",
      }),
      ...patch,
    });
  };

  return (
    <div style={styles.ruleEditor}>
    

      <select
        style={styles.select}
        value={field.visibleIf?.questionKey || ""}
        onChange={(e) => setRule({ questionKey: e.target.value })}
      >
       
        {otherFields.map((f) => (
          <option key={f.id} value={f.questionKey}>
            {f.label}
          </option>
        ))}
      </select>

      {field.visibleIf?.questionKey && (
        <input
          style={styles.input}
          placeholder="Value to match"
          value={field.visibleIf?.value || ""}
          onChange={(e) => setRule({ value: e.target.value })}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    padding: "24px",
    backgroundColor: "#f9fafb",
  },
  maxWidth: {
    maxWidth: "1280px",
    margin: "0 auto",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "24px",
  },
  card: {
    backgroundColor: "white",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  heading: {
    fontWeight: "600",
    marginBottom: "12px",
    fontSize: "18px",
  },
  select: {
    width: "100%",
    border: "1px solid #d1d5db",
    padding: "8px",
    borderRadius: "6px",
    marginBottom: "12px",
  },
  formGroup: {
    marginTop: "16px",
  },
  label: {
    display: "block",
    marginBottom: "4px",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    border: "1px solid #d1d5db",
    padding: "8px",
    borderRadius: "6px",
    boxSizing: "border-box",
  },
  fieldCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "12px",
    marginBottom: "12px",
  },
  fieldHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldName: {
    fontWeight: "500",
  },
  fieldType: {
    fontSize: "12px",
    color: "#6b7280",
  },
  button: {
    padding: "6px 12px",
    borderRadius: "6px",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
  fieldContent: {
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  ruleEditor: {
    border: "1px solid #d1d5db",
    padding: "8px",
    borderRadius: "6px",
    backgroundColor: "#f9fafb",
  },
  ruleTitle: {
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "8px",
  },
  saveContainer: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "flex-end",
  },
};

