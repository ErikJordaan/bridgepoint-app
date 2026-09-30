export interface IFieldDefinition {
  id: number;
  entityType: "opportunity" | "company" | "contact";
  key: string;
  label: string;
  fieldType: "text" | "number" | "date" | "currency" | "boolean" | "select";
  options: string[] | null;
  required: boolean;
  sortOrder: number;
}

// Custom field inputs are named `custom_<key>` in the form so they don't
// collide with core fields - this pulls them back out into a plain object
// matching the shape stored in each record's `customFields` jsonb column.
export function parseCustomFieldValues(formData: FormData, fields: IFieldDefinition[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = formData.get(`custom_${field.key}`);
    if (field.fieldType === "boolean") {
      values[field.key] = raw === "on";
      continue;
    }
    if (raw === null || raw === "") {
      values[field.key] = null;
      continue;
    }
    if (field.fieldType === "number" || field.fieldType === "currency") {
      const num = parseFloat(raw as string);
      values[field.key] = isNaN(num) ? null : num;
      continue;
    }
    values[field.key] = raw as string;
  }
  return values;
}
