module.exports = {
  moduleNameMapper: {
    "^@/(.*)": "<rootDir>/src/$1"
  },
  modulePaths: ["<rootDir>"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: { "^.+\\.ts$": "ts-jest" },
  transformIgnorePatterns: ["!node_modules/"]
};
