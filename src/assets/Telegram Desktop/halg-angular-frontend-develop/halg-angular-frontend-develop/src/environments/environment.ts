// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: true,

  //apiBaseUrl: 'http://192.168.1.198:4040/api/v1/',
  // apiBaseUrl: 'http://192.168.137.56:4040/api/v1/',
  //  apiBaseUrl: 'http://localhost:4040/api/v1/',
  // apiBaseUrl: 'http://192.168.1.168:4040/api/v1/',
  //apiBaseUrl: 'http://198.38.91.113:4040/api/v1/',
 //apiBaseUrl: 'https://dmelplus.heartlandalliance.org.ng:4040/api/v1/',
 apiBaseUrl: 'http://localhost:4040/api/v1/',
  // apiBaseUrl: 'http://192.168.43.61:4040/api/v1/',
  // apiLamisBaseUrl: 'http://localhost:8080/cedar-lamis-webservices/pl/ws/'
  apiLamisBaseUrl: 'http://192.168.1.147:8080/cedar-lamis-webservices/pl/ws/',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
import 'zone.js/dist/zone-error'; // Included with Angular CLI.
