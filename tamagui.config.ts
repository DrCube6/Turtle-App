import { createAnimations } from '@tamagui/animations-react-native'
import { defaultConfig } from '@tamagui/config/v5'
import { createTamagui } from 'tamagui'

export const config = createTamagui({
  ...defaultConfig,
  settings: {
    ...defaultConfig.settings,
    // The v5 preset only types shorthands (bg, p, self...). The app uses
    // longhands (backgroundColor, padding, alignSelf...) throughout, which
    // Tamagui applies at runtime either way, so allow them in the types too.
    onlyAllowShorthands: false,
    // On iOS the preset resolves light/dark colors from the phone's system
    // appearance (DynamicColorIOS), ignoring <Theme name="light">. The app
    // has its own theme switch, so make Tamagui follow that instead.
    fastSchemeChange: false,
  },
  animations: createAnimations({
    quick: {
      type: 'spring',
      damping: 20,
      stiffness: 250,
    },
    medium: {
      type: 'spring',
      damping: 15,
      stiffness: 120,
    },
    lazy: {
      type: 'timing',
      duration: 400,
    },
    bouncy: {
      type: 'spring',
      damping: 10,
      mass: 0.9,
      stiffness: 100,
    }
  }),
  media: {
    ...defaultConfig.media,
    // add your own media queries here, if wanted
  },
})

type OurConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends OurConfig {}
}
