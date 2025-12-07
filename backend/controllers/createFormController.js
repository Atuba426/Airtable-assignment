import User from "../models/User.js";
import Form from "../models/Form.js"
import airtableService from "../services/airtableService.js";

export const getBases = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    if (!user.accessToken)
      return res.status(401).json({ error: "No Airtable access token. Please login with Airtable again" });

    const airtable = airtableService(user.accessToken);

    const bases = await airtable.listBases();
    res.json(bases);

  } catch (error) {
    console.error("Error fetching bases:", error);
    res.status(500).json({ error: "Failed to fetch bases" });
  }
};

export const getTables = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    if (!user.accessToken)
      return res.status(401).json({ error: "No Airtable access token. Please login with Airtable again" });

    
    const airtable = airtableService(user.accessToken);
    res.json(await airtable.listTables(req.query.baseId));
   
  } catch (error) {
    console.error("Error fetching tables:", error);
    res.status(500).json({ error: "Failed to fetch tables" });
  }
};

export const getFields = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    const { baseId, tableId } = req.params;
    if (!baseId || !tableId) {
      return res.status(400).json({
        error: "Missing parameters",
        required: ["baseId", "tableId"],
        received: { baseId, tableId },
      });
    }
    const airtable = airtableService(user.airtable.accessToken);

    const table = await airtable.getTableFields(baseId, tableId);

    res.json({
      tableId: table.id,
      tableName: table.name,
      fields: table.fields,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createForm = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    if (!user.accessToken)
      return res.status(401).json({ error: "No Airtable access token. Please login with Airtable again" });

    
    const {
      baseId,
      tableId,
      selectedFields,
    } = req.body;


    const questions = selectedFields.map((field) => ({
      questionKey: "q_" + field.fieldId,
      fieldId: field.fieldId,
      label: field.label || field.name, // user can rename
      type: field.type,
      required: field.required || false,
      conditionalRules: field.conditionalRules || {},
    }));

    const form = await Form.create({
      owner: user._id,
      baseId,
      tableId,
      questions,
    });

    res.json({
      message: "Form created successfully",
      form,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getAllForms = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    const forms = await Form.find({ owner: user._id }).select(
      "_id formName createdAt updatedAt"
    );
    res.status(200).json(forms);
  } catch (err) {
    res.status(500).json({ message: "Error fetching forms", error: err });
  }
};
export const getFormById = async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);

    if (!form) return res.status(404).json({ error: "Form not found" });

    res.json(form);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
 
 



