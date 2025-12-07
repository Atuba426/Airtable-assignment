import { useEffect } from "react";

export default function Landing() {
  useEffect(() => {
    document.title = "Airtable Forms — Login";
  }, []);

  const connect = () => {
    window.location.href = "/api/auth/airtable/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white-50">
      <div className="p-8 rounded-xl shadow bg-pink-300 w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-4 " >Connect Airtable</h1>
        <p className="text-gray-600 mb-6">
          Authenticate to build forms from your Airtable base and tables.
        </p>
        <button
          onClick={connect}
          className="px-4 py-2 bg-red text-black rounded-md"
        >
          Connect Airtable
        </button>
      </div>
    </div>
  );
}
