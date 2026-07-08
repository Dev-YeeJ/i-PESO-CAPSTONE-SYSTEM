const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const dotenvExpand = require('dotenv-expand')

const envFile = path.resolve(__dirname, '.env')
if (fs.existsSync(envFile)) {
  dotenvExpand.expand(dotenv.config({ path: envFile }))
}

const appJson = require('./app.json')

module.exports = ({ config }) => ({
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || appJson.expo.extra?.EXPO_PUBLIC_API_URL,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || appJson.expo.extra?.apiBaseUrl,
  },
})
