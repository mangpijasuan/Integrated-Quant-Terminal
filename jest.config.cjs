// jest.config.cjs
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/?(*.)+(spec|test).(ts|tsx|js)'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Mock @google/genai to avoid ESM issues in tests
    '^@google/genai$': '<rootDir>/__mocks__/googleGenaiMock.js',
  },
  // Allow ESM modules from @google/genai to be transformed
  transformIgnorePatterns: [
    '/node_modules/(?!(?:@google/genai)/)'
  ],
};
