export const shouldShowQuestion = (rules, answersSoFar) => {
  if (!rules) return true;

  const { logic, conditions } = rules;
  if (!Array.isArray(conditions) || conditions.length === 0) return true;

  const evaluateCondition = (cond) => {
    const value = answersSoFar[cond.questionKey];

    switch (cond.operator) {
      case "equals":
        return value === cond.value;
      case "notEquals":
        return value !== cond.value;
      case "contains":
        if (Array.isArray(value)) return value.includes(cond.value);
        return String(value || "").includes(String(cond.value));
      default:
        return true;
    }
  };

  if (logic === "AND") {
    return conditions.every(evaluateCondition);
  } else if (logic === "OR") {
    return conditions.some(evaluateCondition);
  }
  return true;
};

export const getVisibleFields = (fields, answersSoFar) => {
  return fields.filter((f) =>
    shouldShowQuestion(f.conditionalRules || null, answersSoFar)
  );
};
export default { shouldShowQuestion, getVisibleFields };
