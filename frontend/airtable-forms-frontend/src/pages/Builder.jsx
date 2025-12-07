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

export default function Builder() {
  const { formId } = useParams();
  const navigate = useNavigate();

  const [bases, setBases] = useState([]);
  const [tables, setTables] = useState([]);
  const [fields, setFields] = useState([]);

  const [selected, setSelected] = useState({ baseId: "", tableId: "" });

  const [form, setForm] = useState({
    title: "",
    slug: "",
    fields: [],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Form Builder";
  }, []);

  // Load bases
  useEffect(() => {
    api
      .get("/airtable/bases")
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
        slug: f.slug,
        fields: f.fields || [],
      });
      setSelected({ baseId: f.baseId, tableId: f.tableId });
    });
  }, [formId]);

  // Load tables when base changes
  useEffect(() => {
    if (!selected.baseId) return;
    api
      .get("/airtable/tables", {
        params: { baseId: selected.baseId },
      })
      .then((r) => setTables(r.data.tables || []));
  }, [selected.baseId]);

  // Load fields when table changes
  useEffect(() => {
    if (!selected.baseId || !selected.tableId) return;
    api
      .get(`/airtable/${selected.baseId}/${selected.tableId}/fields`)
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

    if (!form.slug) return alert("Enter a slug");

    setLoading(true);
    const payload = {
      ...form,
      baseId: selected.baseId,
      tableId: selected.tableId,
    };

    try {
      let r;
      if (formId) {
        r = await api.put(`/forms/${formId}`, payload);
      } else {
        r = await api.post("/forms", payload);
      }
      navigate(`/form/${r.data.slug}`);
    } catch (err) {
      alert(err.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        {/* Left Section: Base/Table + Title + Slug */}
        <section className="bg-white p-4 rounded border">
          <h2 className="font-semibold mb-3">Pick Base → Table</h2>

          <select
            className="w-full border p-2 rounded mb-3"
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
            className="w-full border p-2 rounded"
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

          <div className="mt-4">
            <label className="block mb-1">Form Title</label>
            <input
              className="w-full border p-2 rounded"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
            />
          </div>

          <div className="mt-3">
            <label className="block mb-1">Slug</label>
            <input
              className="w-full border p-2 rounded"
              value={form.slug}
              onChange={(e) =>
                setForm({ ...form, slug: e.target.value })
              }
              placeholder="my-form"
            />
          </div>
        </section>

        {/* Right Section: Fields */}
        <section className="bg-white p-4 rounded border">
          <h2 className="font-semibold mb-2">Fields</h2>

          {compatibleFields.map((f) => {
            const included = !!form.fields.find(
              (x) => x.airtableFieldId === f.id
            );
            const field = form.fields.find(
              (x) => x.airtableFieldId === f.id
            );

            return (
              <div key={f.id} className="border rounded p-3 mb-3">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-gray-500">{f.type}</div>
                  </div>

                  <button
                    className={`px-2 py-1 rounded ${
                      included
                        ? "bg-red-500 text-white"
                        : "bg-black text-white"
                    }`}
                    onClick={() => toggleInclude(f)}
                  >
                    {included ? "Remove" : "Add"}
                  </button>
                </div>

                {included && (
                  <div className="mt-2 space-y-2">
                    <input
                      className="border p-2 rounded w-full"
                      value={field.label}
                      onChange={(e) =>
                        updateField(field.id, {
                          label: e.target.value,
                        })
                      }
                    />

                    <label className="flex items-center gap-2">
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

        <div className="md:col-span-2 flex justify-end">
          <button
            disabled={loading}
            onClick={save}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            {loading ? "Saving..." : formId ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------ HELPERS ------------------

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
    <div className="border p-2 rounded bg-gray-50">
      <div className="text-sm font-medium">Conditional Logic</div>

      <select
        className="border p-1 w-full rounded mt-1"
        value={field.visibleIf?.questionKey || ""}
        onChange={(e) => setRule({ questionKey: e.target.value })}
      >
        <option value="">Always visible</option>
        {otherFields.map((f) => (
          <option key={f.id} value={f.questionKey}>
            {f.label}
          </option>
        ))}
      </select>

      {field.visibleIf?.questionKey && (
        <input
          className="border p-1 rounded w-full mt-2"
          placeholder="Value to match"
          value={field.visibleIf?.value || ""}
          onChange={(e) => setRule({ value: e.target.value })}
        />
      )}
    </div>
  );
}
