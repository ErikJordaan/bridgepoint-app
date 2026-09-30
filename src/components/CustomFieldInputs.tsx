"use client";

import { IFieldDefinition } from "@/lib/custom-fields";

export default function CustomFieldInputs({
  fields,
  values
}: {
  fields: IFieldDefinition[];
  values?: Record<string, unknown>;
}) {
  if (fields.length === 0) return null;

  return (
    <>
      {fields.map(field => {
        const currentValue = values?.[field.key];
        const name = `custom_${field.key}`;

        return (
          <div className="form-row" key={field.id}>
            {field.fieldType === "boolean" ? (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
                <input type="checkbox" name={name} style={{ width: "auto" }} defaultChecked={currentValue === true} />
                {field.label}
              </label>
            ) : field.fieldType === "select" ? (
              <>
                <label>{field.label}{field.required && " *"}</label>
                <select name={name} defaultValue={(currentValue as string) || ""} required={field.required}>
                  <option value="">Select...</option>
                  {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </>
            ) : (
              <>
                <label>{field.label}{field.required && " *"}</label>
                <input
                  name={name}
                  type={field.fieldType === "date" ? "date" : field.fieldType === "number" || field.fieldType === "currency" ? "number" : "text"}
                  step={field.fieldType === "currency" ? "0.01" : undefined}
                  defaultValue={currentValue !== null && currentValue !== undefined ? String(currentValue) : ""}
                  required={field.required}
                />
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
