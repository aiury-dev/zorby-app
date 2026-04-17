# Zorby App

## Desenvolvimento
`npx expo start`

## Build de teste (APK Android)
`eas build --platform android --profile preview`

## Build de produção (AAB Android)
`eas build --platform android --profile production`

## Build iOS (requer conta Apple Developer)
`eas build --platform ios --profile production`

## Submit para stores
`eas submit --platform android`

`eas submit --platform ios`

## Atualização OTA (sem nova build)
`eas update --branch production --message "Descrição da atualização"`
