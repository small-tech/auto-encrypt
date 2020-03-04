// ////////////////////////////////////////////////////////////////////////////////
// //
// // Certificate
// //
// // (Singleton; please use Certificate.getSharedInstance() (async) to access.)
// //
// // Represents a Let’s Encrypt TLS certificate.
// //
// // Copyright © 2020 Aral Balkan, Small Technology Foundation.
// // License: AGPLv3 or later.
// //
// ////////////////////////////////////////////////////////////////////////////////

// const path = require('path')
// const fs = require('fs-extra')

// const Configuration = require('./Configuration')

// // Continue to end of file to see the rest of the dependencies. The ones at the
// // end are there as they require a reference to this class.
// // (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

// class Certificate {
//   //
//   // Singleton access (async).
//   //
//   static instance = null
//   static isBeingInstantiatedViaSingletonFactoryMethod = false

//   static async getSharedInstance () {
//     if (Certificate.instance === null) {
//       Certificate.isBeingInstantiatedViaSingletonFactoryMethod = true
//       Certificate.instance = new Certificate()
//       await Certificate.instance.init()
//     }
//     return Certificate.instance
//   }

//   //
//   // Private.
//   //

//   constructor () {
//     // Ensure singleton access.
//     if (Certificate.isBeingInstantiatedViaSingletonFactoryMethod === false) {
//       throw new Error('Certificate is a singleton. Please instantiate using the Certificate.getSharedInstance() method.')
//     }
//     Certificate.isBeingInstantiatedViaSingletonFactoryMethod = false
//   }

//   async init () {
//     const certificatePath = path.join(Configuration.settingsPath, 'certificate.pem')
//     if (fs.existsSync(certificatePath)) {
//       this._certificate = fs.readFileSync(certificatePath, 'utf-8')
//       return
//     }

//     // Certificate does not exist.
//   }
// }

// module.exports = Certificate
