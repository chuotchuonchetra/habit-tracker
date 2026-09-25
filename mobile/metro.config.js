const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)

// The shared files and the root node_modules they resolve against both live
// outside projectRoot, so both have to be watched or Metro will not consider
// files under them.
config.watchFolders = [
  path.resolve(workspaceRoot, 'src'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// Both trees must be searched: mobile/ holds react-native, react-navigation and
// nativewind, while ../node_modules holds the @supabase/* clients that the
// shared factory in ../src/lib imports.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// nodeModulesPaths alone is not enough: the requiring file lives outside the
// project root, so Metro's walk-up never reaches the root tree from it. Mapping
// the scope explicitly is what actually pins @supabase/* to the copies the web
// app uses, which also keeps it to a single instance at runtime.
config.resolver.extraNodeModules = {
  '@supabase': path.resolve(workspaceRoot, 'node_modules', '@supabase'),
}

// The @supabase/* packages ship no "exports" field, only "main". Metro's
// package-exports resolver does not fall back to "main" for them under the
// Expo default, so the scope resolves to nothing.
config.resolver.unstable_enablePackageExports = false

// Hierarchical lookup stays ON. npm nests some of expo's own dependencies
// (expo-asset, expo-constants) under node_modules/expo/node_modules rather than
// hoisting them, and only the walk-up from the importing file finds those.

module.exports = withNativeWind(config, { input: './global.css' })
