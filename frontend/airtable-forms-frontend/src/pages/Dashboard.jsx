import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api.js";

export default function Dashboard() {
  const [forms, setForms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Dashboard — Airtable Forms";
    fetchForms();
  }, []);

  const fetchForms = () => {
    api
      .get("/airtable/get-forms",)
      .then((r) => setForms(r.data.forms))  // backend returns { forms: [...] }
      .catch((err) => console.log(err));

  };



  const onDelete = async (id) => {
    if (!confirm("Delete this form? This cannot be undone.")) return;
    try {
      await api.delete(`/forms/${id}`);  // matches backend route
      fetchForms();
    } catch (e) {
      alert(e.response?.data?.error || "Failed to delete form");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-blue-300">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>

          <button
            onClick={() => navigate("/builder")}
            className="px-4 py-2 bg-blue-600 text-black font-semibold rounded-md shadow-md hover:bg-blue-700"
          >
            Create Form
          </button>
        </div>

        <div className="bg-white rounded-lg shadow divide-y">
          <div className="p-4 font-medium">Saved Forms</div>

          {forms.length === 0 && (
            <div className="p-4 text-gray-500">No forms yet.</div>
          )}

          {forms.map((f) => (
            <div key={f._id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{f.title}</div>
                {/* Slug is optional now */}
              </div>

              <div className="flex items-center gap-3">
                <Link
                  className="text-blue-600 hover:text-blue-800 font-medium"
                  to={`/builder/${f._id}`}   // edit uses MongoDB id
                >
                  Edit
                </Link>

                <Link
                  className="text-green-600 hover:text-green-800 font-medium"
                  to={`/form/${f._id}`}      // viewer uses id NOT slug
                >
                  Open
                </Link>

                <button
                  className="text-red-600 hover:text-red-800 font-medium"
                  onClick={() => onDelete(f._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
