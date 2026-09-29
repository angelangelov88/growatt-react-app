import { z } from "zod";

// POST /api/contact and the contact form. website is a trap for bots: it's
// hidden from people, so anything in it means the form was filled by a script.
const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100, "Too long"),
  email: z.email("Enter a valid email address").max(254),
  message: z
    .string()
    .trim()
    .min(10, "Tell me a bit more (at least 10 characters)")
    .max(5000, "At most 5000 characters"),
  website: z.string().max(200).optional(),
});

export { contactSchema };
