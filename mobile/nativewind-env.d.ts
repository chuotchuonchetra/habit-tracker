/// <reference types="nativewind/types" />

// Lets `import './global.css'` typecheck; the styles are applied by the
// NativeWind Babel/Metro pipeline, not by the type system.
declare module '*.css'
