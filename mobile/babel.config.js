module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      // jsxImportSource: 'nativewind' rewrites every <View>/<Text>/<Pressable>
      // to the NativeWind equivalents, which is what lets the Tailwind class
      // strings used on the web work unchanged here.
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
