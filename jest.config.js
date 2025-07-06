const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: ["**/tests/**/*.test.ts"], // 👈 only run tests from /tests/
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1", // 👈 makes @/lib/db work inside tests
  },
};
