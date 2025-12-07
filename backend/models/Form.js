import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema(
  {
    questionKey: {
      type: String,
      required: true,
    },
    airtableFieldId: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["short_text", "long_text", "single_select", "multi_select", "attachment"],
      required: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    conditionalRules: {
      type: Array, 
      default: [],
    },
  },
  { _id: false }
);

const FormSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    baseId: {
      type: String,
      required: true,
    },
    tableId: {
      type: String,
      required: true,
    },
    questions: {
      type: [QuestionSchema],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Form = mongoose.model("Form", FormSchema);
export default Form;

