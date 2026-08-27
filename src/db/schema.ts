import { pgTable, text, integer, boolean, timestamp, jsonb, numeric, primaryKey, unique } from "drizzle-orm/pg-core";

// ============================================================
// Auth tables (user/session/account/verification) are NOT
// hand-written here. Better Auth generates its own schema based
// on the config in src/lib/auth.ts - run:
//   npx @better-auth/cli generate
// after installing dependencies, and it will create the exact
// tables it needs (including a "role" field we add to the user
// model via Better Auth's additionalFields config). Hand-writing
// these risks drifting from whatever the installed Better Auth
// version actually expects.
// ============================================================

// ---------- Roles & Permissions ----------
// A role is just a name (e.g. "Sales", "Operations") - fully
// admin-manageable, not hardcoded. What a role can/cannot do is
// entirely driven by which rows exist in rolePermissions.

export const roles = pgTable("roles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// The fixed list of possible capabilities lives in code
// (src/lib/permissions.ts), not the database - this table just
// records which of those capabilities each role currently has.
export const rolePermissions = pgTable("role_permissions", {
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionKey: text("permission_key").notNull()
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionKey] })
}));

// ---------- Configurable field definitions ----------
// Admin-defined extra fields on Opportunities/Companies/Contacts.
// Values are stored in each entity's own `customFields` jsonb
// column, keyed by this field's `key`.

export const fieldDefinitions = pgTable("field_definitions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entityType: text("entity_type", { enum: ["opportunity", "company", "contact"] }).notNull(),
  key: text("key").notNull(),               // stable identifier used in the jsonb blob, e.g. "referral_source"
  label: text("label").notNull(),           // display label, e.g. "Referral Source"
  fieldType: text("field_type", { enum: ["text", "number", "date", "currency", "boolean", "select"] }).notNull(),
  options: jsonb("options").$type<string[]>(),  // choices, only used when fieldType = "select"
  required: boolean("required").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (t) => ({
  uniqueKeyPerEntity: unique().on(t.entityType, t.key)
}));

// ---------- Deal Stages ----------

export const dealStages = pgTable("deal_stages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  probability: integer("probability").notNull(),
  sortOrder: integer("sort_order").notNull(),
  isClosedWon: boolean("is_closed_won").default(false).notNull(),
  isClosedLost: boolean("is_closed_lost").default(false).notNull()
});

// ---------- Companies ----------

export const companies = pgTable("companies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  phone: text("phone"),
  active: boolean("active").default(true).notNull(),
  customFields: jsonb("custom_fields").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// ---------- Contacts ----------

export const contacts = pgTable("contacts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email"),
  mobile: text("mobile"),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  active: boolean("active").default(true).notNull(),
  customFields: jsonb("custom_fields").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// ---------- Opportunities ----------

export const opportunities = pgTable("opportunities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  reference: text("reference").notNull().unique(),   // simple sequential reference, e.g. "OPP-1042"
  title: text("title").notNull(),
  description: text("description"),
  companyId: integer("company_id").notNull().references(() => companies.id),
  contactId: integer("contact_id").references(() => contacts.id),
  ownerId: text("owner_id").notNull(),               // references Better Auth's user.id (text)
  stageId: integer("stage_id").notNull().references(() => dealStages.id),
  value: numeric("value", { precision: 14, scale: 2 }),
  probability: integer("probability").notNull(),
  weightedValue: numeric("weighted_value", { precision: 14, scale: 2 }),
  nextAction: text("next_action"),
  nextActionDate: timestamp("next_action_date"),
  isOpen: boolean("is_open").default(true).notNull(),
  closeDate: timestamp("close_date"),
  finalValue: numeric("final_value", { precision: 14, scale: 2 }),
  lostReason: text("lost_reason"),
  customFields: jsonb("custom_fields").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// ---------- Opportunity Actions (follow-up log) ----------

export const opportunityActions = pgTable("opportunity_actions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  opportunityId: integer("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
  actionDate: timestamp("action_date").defaultNow().notNull(),
  actionById: text("action_by_id").notNull(),  // Better Auth user.id
  method: text("method", { enum: ["None", "Telephonic", "Email", "In Person"] }).default("None").notNull(),
  notes: text("notes"),
  nextAction: text("next_action"),
  nextActionDate: timestamp("next_action_date")
});
