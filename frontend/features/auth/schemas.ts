import { z } from "zod";

import type { Messages } from "@/lib/i18n/fr";

export const makeLoginSchema = (t: Messages) =>
  z.object({
    email: z.string().trim().min(1, t.validation.emailRequired).email(t.validation.emailInvalid),
    password: z.string().min(1, t.validation.passwordRequired),
  });
export type LoginValues = z.infer<ReturnType<typeof makeLoginSchema>>;

export const makeRegisterSchema = (t: Messages) =>
  z.object({
    first_name: z
      .string()
      .trim()
      .min(1, t.validation.firstNameRequired)
      .max(100, t.validation.max(100)),
    email: z.string().trim().min(1, t.validation.emailRequired).email(t.validation.emailInvalid),
    password: z.string().min(8, t.validation.passwordMin).max(128, t.validation.max(128)),
  });
export type RegisterValues = z.infer<ReturnType<typeof makeRegisterSchema>>;
