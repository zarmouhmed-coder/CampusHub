import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Saisis ton adresse e-mail.").email("Adresse e-mail invalide."),
  password: z.string().min(1, "Saisis ton mot de passe."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  first_name: z.string().trim().min(1, "Saisis ton prénom.").max(100, "100 caractères maximum."),
  email: z.string().trim().min(1, "Saisis ton adresse e-mail.").email("Adresse e-mail invalide."),
  password: z.string().min(8, "Au moins 8 caractères.").max(128, "128 caractères maximum."),
});
export type RegisterValues = z.infer<typeof registerSchema>;
