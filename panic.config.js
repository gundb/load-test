/* eslint-disable no-process-env, require-jsdoc */
'use strict';

const Manager = require('panic-manager');
const join = require('path').join;

function random () {
  return Math.random().toString(36).slice(2);
}

/**
 * Load test configuration variables.
 * @namespace config
 */
module.exports = {

  /** @type {Number} - The port for panic to listen on. */
  port: Number(process.env.PORT) || 8080,

  /** @type {String} - The local ip/hostname of panic. */
  hostname: 'localhost',

  /** @type {Object[]} - What platforms to expect. */
  platforms: Array(2).fill().map(function () {
    return {

      /** @type {String} - A key for gun to save data to. */
      key: random(),

      /** @type {Number} - How many messages each client should send. */
      messages: 100,

      /** @type {Number|null} - How long to pause between messages. */
      interval: 1,
    };
  }),

  /** @type {Manager} - A local or remote panic manager. */
  manager: Manager(),

  /** @type {Object[]} - The number of app servers. */
  servers: [{

    /** The type of client to spin up, passed to Manager#start. */
    type: 'node',

    /** Used for addressing. */
    hostname: 'localhost',
    port: 3000,

    /** Where the gun server should save it's data. */
    file: join(__dirname, '3000.json'),

    /** Server routes for static files. */
    routes: {
      '/gun.js': require.resolve('gun/gun.js'),
      '/': require.resolve('./index.html'),
    },
  }],

  /** @type {String} - The absolute path to your gun library. */
  gun: require.resolve('gun'),
};
