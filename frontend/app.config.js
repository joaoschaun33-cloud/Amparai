// Config dinâmico do Expo.
// Estende o app.json e injeta os caminhos dos arquivos google-services vindos dos
// EAS File Secrets (GOOGLE_SERVICES_JSON / GOOGLE_SERVICES_PLIST) no build da nuvem.
// Localmente, cai no arquivo presente em frontend/ (ex.: ./google-services.json).
export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
  ios: {
    ...config.ios,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_PLIST ?? config.ios?.googleServicesFile,
  },
});
