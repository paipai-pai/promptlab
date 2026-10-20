import { z } from "zod";

const emailSchema = z
  .email("请输入有效的邮箱地址。")
  .max(254, "邮箱地址过长。")
  .transform((value) => value.trim().toLowerCase());

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "请输入密码。").max(72, "密码不能超过 72 个字符。"),
});

export const signupSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, "密码至少需要 8 个字符。")
      .max(72, "密码不能超过 72 个字符。"),
    confirmPassword: z.string().min(1, "请再次输入密码。"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致。",
    path: ["confirmPassword"],
  });

export const emailOtpTypeSchema = z.enum([
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
]);

export type AuthFieldErrors = Partial<
  Record<"email" | "password" | "confirmPassword", string[]>
>;

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: AuthFieldErrors;
};

export const INITIAL_AUTH_FORM_STATE: AuthFormState = {
  status: "idle",
};
