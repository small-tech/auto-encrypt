# @small-tech/acme-http-01

Implements the subset of [RFC 8555](https://tools.ietf.org/html/rfc8555) – Automatic Certificate Management Environment (ACME) – necessary for a client to support TLS certificate provisioning from [Let’s Encrypt](https://letsencrypt.org) using [HTTP-01 challenges](https://tools.ietf.org/html/rfc8555#section-8.3).

## Coverage

File                            |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |
--------------------------------|----------|----------|----------|----------|-------------------|
All files                       |     93.4 |     91.3 |    81.97 |     93.3 |                   |
  acme-http-01                   |      100 |      100 |      100 |      100 |                   |
  index.js                      |      100 |      100 |      100 |      100 |                   |
  acme-http-01/lib               |    92.61 |       90 |       80 |    92.53 |                   |
  Account.js                    |      100 |      100 |      100 |      100 |                   |
  AcmeRequest.js                |      100 |       80 |      100 |      100 |                25 |
  Configuration.js              |      100 |      100 |      100 |      100 |                   |
  Directory.js                  |      100 |      100 |      100 |      100 |                   |
  Identity.js                   |      100 |      100 |      100 |      100 |                   |
  Nonce.js                      |      100 |      100 |      100 |      100 |                   |
  Order.js                      |    56.67 |       50 |    21.43 |    56.67 |... 54,55,56,61,73 |
  acme-http-01/lib/acme-requests |    93.75 |      100 |      100 |    93.33 |                   |
  NewAccountRequest.js          |      100 |      100 |      100 |      100 |                   |
  NewOrderRequest.js            |    88.89 |      100 |      100 |     87.5 |                27 |


(For the latest state, run `npm run coverage`)

## A note on Linux and the security farce that is “privileged ports”

Linux has an outdated feature dating from the mainframe days that requires a process that wants to bind to ports < 1024 to have elevated privileges. While this was a security feature in the days of dumb terminals, today it is a security anti-feature. (macOS has dropped this requirement as of macOS Mojave.)

On Linux, ensure your Node process has the right to bind to so-called “privileged” ports by issuing the following command before use:

```sh
sudo setcap cap_net_bind_service=+ep $(which node)
```

If you are wrapping your Node app into an executable binary using a module like [Nexe](https://github.com/nexe/nexe), you will have to ensure that every build of your app has that capability set. For an example of how we do this in [Site.js](https://sitejs.org), [see this listing](https://source.ind.ie/site.js/app/blob/master/bin/lib/ensure.js#L124).

## Copyright

&copy; 2020 [Aral Balkan](https://ar.al), [Small Technology Foundation](https://small-tech.org).

## License

[AGPL version 3.0 or later.](https://www.gnu.org/licenses/agpl-3.0.en.html)
