import { z } from "zod";

export const UserRoleSchema = z.enum(["admin", "student", "resident", "guardian"]);

export const RegisterAccountInput = z
  .object({
    role: z.enum(["student", "resident", "guardian"]),
  })
  .strict();

export const StudentProfileInput = z
  .object({
    age: z.number().int().min(13).max(18),
    homeAddress: z.string().trim().min(5).max(300),
    guardianName: z.string().trim().min(2).max(120),
    guardianEmail: z.string().trim().email().max(254),
  })
  .strict();

export const ResidentProfileInput = z
  .object({
    homeAddress: z.string().trim().min(5).max(300),
  })
  .strict();

export const AuthUserResponse = z.object({
  firstName: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  profileComplete: z.boolean(),
});
