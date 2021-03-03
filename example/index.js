////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Plain Node HTTPS server example using Auto Encrypt.
//
// This example uses the local Pebble testing server.
//
// Before you alter it to use the Let’s Encrypt staging or production servers, ensure that:
//
// 1. You have your hostname set correctly for your system.
//
//    Linux  : set it in /etc/hostname or via hostnamectl set-hostname <hostname>
//
//    macOS  : sudo scutil --set HostName <hostname>
//
//    Windows: *sigh* ok, so, to set your hostname as fml.this.sucks:
//      a. Control Panel → System And Security → System →
//         Change Settings link (next to Computer name) → [Change…] Button
//      b. Under Computer name, enter your subdomain (fml)
//      c. [More…] Button → enter your domain name (this.sucks) in the Primary DNS suffix of this computer field.
//      d. Press the various [OK] buttons to dismiss the various modal dialogues and restart your computer.
//      e. (Optional) If you can, get a proper development machine (see Linux and macOS, above).
//
// 2. You have some means of forwarding your hostname to your computer from the outside network. E.g., ngrok
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import AutoEncrypt from '../index.js'
import Pebble from '@small-tech/node-pebble'

// const os = require('os')
// const AutoEncrypt = require('../dist/auto-encrypt.js')
// const Pebble = require('@small-tech/node-pebble')

console.log('\n 🌄 Auto Encrypt “Hello, world!” Example \n')

async function main() {

  // Pebble is the local Let’s Encrypt testing server.
  await Pebble.ready()

  const options = {
    /* Custom http server options, if any, go here (we don’t have any in this
      example, so we could just not have passed this empty object at all). */

    serverType: AutoEncrypt.serverType.PEBBLE                // (The default is .PRODUCTION.)
  }

  const server = AutoEncrypt.https.createServer(options, (request, response) => {
    response.end('Hello, world!')
  })

  server.listen(443, () => {
    console.log(`\n ✨ “Hello, world!” server is running at https://localhost:${server.address().port}…\n`)
  })
}

main()
