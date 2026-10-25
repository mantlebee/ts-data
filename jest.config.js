module.exports = {
  collectCoverageFrom: ["src/**/*.ts"],
  coverageThreshold: {
    global: { branches: 95, functions: 95, lines: 95, statements: 95 },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@test/(.*)$": "<rootDir>/test/$1",
  },
  modulePaths: ["<rootDir>/src"],
  testEnvironment: "jsdom",
  testRegex: "\.test\.ts$",
  transform: { "^.+\.ts$": "ts-jest" },
  transformIgnorePatterns: ["!node_modules/"],
};
