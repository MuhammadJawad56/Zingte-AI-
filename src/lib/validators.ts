import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  name: z.string().min(2, "Name is required"),
  company: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const apiProductFieldsSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  category: z.string().min(2),
  baseUrl: z.string().url(),
  version: z.string().default("v1"),
  priceMonthly: z.number().positive(),
  priceYearly: z.number().positive(),
  rateLimit: z.number().int().positive().default(1000),
  features: z.array(z.string()).min(1),
  documentation: z.string().optional(),
});

export const updateApiProductSchema = apiProductFieldsSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createTokenSchema = z.object({
  apiProductId: z.string(),
  name: z.string().min(1).max(50),
});

export const checkoutSchema = z.object({
  apiProductId: z.string(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
});
