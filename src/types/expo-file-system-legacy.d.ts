// Re-exports the public API of expo-file-system for the /legacy sub-path.
// The package ships `legacy.ts` but doesn't declare the sub-path in its
// `exports` field, so TypeScript can't resolve it automatically.
declare module 'expo-file-system/legacy' {
  export * from 'expo-file-system';
}
