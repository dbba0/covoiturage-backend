import { hashPassword } from "../utils/password.js";

describe("TU-01 – Hash du mot de passe", () => {
  test("Le mot de passe hashé est différent du mot de passe en clair", async () => {
    const password = "123456";
    const hashed = await hashPassword(password);
    expect(hashed).not.toBe(password);
  });
});