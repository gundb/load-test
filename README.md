# GunDB Load Test
*Programmatically test how gun handles oodles of traffic*

## Running the test
1. Clone this repo
2. `npm install` the dependencies
3. Run `npm test`
4. Open a browser to `http://localhost:3000`

The test should run automatically.

To tweak the test variables (there are *a lot* of variables), open `panic.config.js` and go wild.

For example:
- How many browsers
- How many servers
- How many messages/how fast
- What gun path to use

And plenty more.
