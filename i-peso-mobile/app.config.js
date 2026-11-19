const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const dotenvExpand = require('dotenv-expand')

const envFile = path.resolve(__dirname, '.env')
if (fs.existsSync(envFile)) {
  dotenvExpand.expand(dotenv.config({ path: envFile }))
}

// `config` is app.json's "expo" block, which Expo passes in already loaded.
module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins || []), '@react-native-community/datetimepicker'],
  extra: {
    ...config.extra,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || config.extra?.EXPO_PUBLIC_API_URL,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || config.extra?.apiBaseUrl,
  },
})
