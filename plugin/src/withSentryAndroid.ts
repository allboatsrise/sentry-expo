import {
  ConfigPlugin,
  WarningAggregator,
  withAppBuildGradle,
  withDangerousMod,
} from '@expo/config-plugins';
import * as path from 'path';

import { writeSentryPropertiesTo } from './withSentryIOS';

export const withSentryAndroid: ConfigPlugin<string> = (config, sentryProperties: string) => {
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = modifyAppBuildGradle(config.modResults.contents);
    } else {
      throw new Error(
        'Cannot configure Sentry in the app gradle because the build.gradle is not groovy'
      );
    }
    return config;
  });
  return withDangerousMod(config, [
    'android',
    (config) => {
      writeSentryPropertiesTo(
        path.resolve(config.modRequest.projectRoot, 'android'),
        sentryProperties
      );
      return config;
    },
  ]);
};

/**
 * Writes to projectDirectory/android/app/build.gradle,
 * adding the relevant @sentry/react-native script.
 *
 * We can be confident that the react-native/react.gradle script will be there.
 */
export function modifyAppBuildGradle(buildGradle: string) {
  if (buildGradle.includes('/sentry.gradle"')) {
    return buildGradle;
  }
  const pattern = /(.*\/react\.gradle"\)?)(\s|\n|$)/;

  if (!buildGradle.match(pattern)) {
    WarningAggregator.addWarningAndroid(
      'sentry-expo',
      'Could not find react.gradle script in android/app/build.gradle. Please open a bug report at https://github.com/expo/sentry-expo.'
    );
  }

  return buildGradle.replace(
    pattern,
    `$1
apply from: new File(["node", "--print", "require.resolve('@sentry/react-native/package.json')"].execute().text.trim(), "../sentry.gradle")
`
  );
}
