import mongoose from "mongoose";

const ResponseSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },
    airtableRecordId: {
      type: String, 
      required: true,
    },
    answers: {
      type: Object, 
      required: true,
    },
    deletedInAirtable: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Response", ResponseSchema);
