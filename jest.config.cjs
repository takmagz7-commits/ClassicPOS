module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.cjs', '**/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'backend/**/*.cjs',
    '!backend/node_modules/**',
    '!backend/coverage/**',
  ],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/public/nodejs/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/public/nodejs/',
  ],
};
