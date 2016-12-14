/* eslint-env mocha */
'use strict';

const panic = require('panic-server');
const config = require('./panic.config.js');
const helpers = require('./helpers');
const httpServer = panic.server();
const manager = config.manager;
const servers = panic.clients.filter('Node.js');
const browsers = panic.clients.excluding(servers);

const count = {
  servers: config.servers.length,
  clients: config.platforms.length,
  messages: config.platforms.reduce(function (sum, platform) {
    return sum + platform.messages;
  }, 0),
};

const desc = {
  scenario: `${count.servers} gun \
server${count.servers > 1 ? 's' : ''}`,

  test: `should be able to handle ${count.clients} \
browser${count.clients > 1 ? 's' : ''} \
sending ${count.messages} messages at a rate of 1 per \
${config.interval || 0} ms`,
};

describe(desc.scenario, function () {

  // Set up the servers.
  before(function * () {

    httpServer.listen(config.port);

    // Start the servers.
    manager.start({
      clients: config.servers,

      panic: `http://${config.hostname}:${config.port}`,
    });

    // Wait for them to join.
    yield servers.atLeast(count.servers);

    // Set a flag so we can distinguish between node
    // clients and app servers.
    yield servers.run(function () {
      this.set('is-server', true);
    });

    const serversArray = [];
    servers.each(function (server) {
      serversArray.push(server);
    });

    const setups = serversArray.map(function (server, index) {
      const setting = config.servers[index];

      return server.run(helpers.setupGun, {
        gunPath: config.gun,
        file: setting.file,
      });

    });

    yield Promise.all(setups);

    const jobs = serversArray.map(function (server, index) {
      const settings = config.servers[index];
      const start = helpers.setupGunServer;

      return server.run(start, settings).then(function (url) {
        settings.url = url;
      });
    });

    yield Promise.all(jobs);

  });

  before(function * () {

    this.timeout(15000);

    yield browsers.atLeast(count.clients);

  });

  it(desc.test, function * () {

    this.timeout((config.interval || 1) * config.messages + 3000);

    yield browsers.run(function () {
      localStorage.clear();
    });

    yield browsers.run(helpers.injectScript, {
      src: `${config.servers[0].url}/gun.js`,
    });

    yield browsers.run(helpers.setupGun, {
      peers: config.servers.map(function (setting) {
        return setting.url;
      }),

      gunPath: config.gun,
    });

    const browsersArray = [];
    browsers.each(function (browser) {
      browsersArray.push(browser);
    });

    const saves = browsersArray.map(function (browser, index) {
      const setting = config.platforms[index];

      return browser.run(helpers.sendMessages, setting);
    });

    yield Promise.all(saves);

    yield servers.run(helpers.waitForAllData, {
      platforms: config.platforms,
    });
  });

  after(function * () {

    const files = yield servers.run(function () {
      return this.get('file');
    });

    // Close all the servers we opened.
    yield servers.run(function () {
      if (this.get('is-server')) {
        process.exit();
      }
    });

    manager.start({
      clients: [{ type: 'node' }],
      panic: `http://${config.hostname}:${config.port}`,
    });

    yield servers.atLeast(1);

    yield servers.run(helpers.removeFiles, {
      files: files,
    });

    yield browsers.run(function () {
      location.reload();
    });

    httpServer.close();

  });

});
