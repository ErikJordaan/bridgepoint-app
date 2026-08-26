import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Resend } from "resend";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),

  // Explicit allow-list of origins that are permitted to sign in / use the
  // session. Without this, Better Auth's CSRF protection can reject requests
  // even from your own domain if it doesn't exactly match its inferred base
  // URL (e.g. a www vs. non-www mismatch, or testing on the .vercel.app URL
  // alongside a custom domain).
  trustedOrigins: [
    "https://bridgepointapp.co.za",
    "https://www.bridgepointapp.co.za",
    "https://*.vercel.app",   // covers every Vercel preview/deployment URL, which changes on every push
    "http://localhost:3000"
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // internal tool, single org - admins create accounts directly
    sendResetPassword: async ({ user, url }) => {
      if (!process.env.RESEND_API_KEY) {
        console.warn(`RESEND_API_KEY not set - password reset email to ${user.email} was not sent. Reset link: ${url}`);
        return;
      }
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "BridgePoint <noreply@bridgepointapp.co.za>",
        to: user.email,
        subject: "Reset your BridgePoint password",
        html: `<p>Click the link below to reset your BridgePoint password. This link expires in 1 hour.</p>
               <p><a href="${url}">Reset password</a></p>
               <p>If you didn't request this, you can safely ignore this email.</p>`
      });
    }
  },

  // Extends Better Auth's built-in user table with a `role` column - this
  // stores the role NAME (matches roles.name in our own schema) directly on
  // the user for simplicity, rather than a foreign key, since Better Auth
  // manages its own user table separately from our app tables.
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "Sales"
      },
      active: {
        type: "boolean",
        required: true,
        defaultValue: true
      }
    }
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24       // refresh session token once per day of activity
  }
});
