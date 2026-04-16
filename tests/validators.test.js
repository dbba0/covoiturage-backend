import { isValidEmail } from "../utils/validators.js";

describe("TU – Validation email", () => {
  test("Email valide", () => {
    expect(isValidEmail("test@mail.com")).toBe(true);
  });

  test("Email invalide", () => {
    expect(isValidEmail("testmail.com")).toBe(false);
  });
});