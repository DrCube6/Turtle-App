module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-expo'], 
      'nativewind/babel'
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            'tailwind.config': './tailwind.config.js',
          },
        },
      ],
      // Reanimated / Worklets plugin **MUST be last**
      'react-native-worklets/plugin',
    ],
  };
};