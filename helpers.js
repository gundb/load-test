/*
  eslint-disable
  no-sync,
  require-jsdoc,
  no-underscore-dangle,
 */
'use strict';

module.exports = {

  /**
   * Injects a script tag into a browser window.
   * @return {undefined}
   */
  injectScript: function () {
    this.async();

    const script = document.createElement('script');

    if (!this.props.src) {
      throw new Error('Missing `.src` property in injectScript job.');
    }

    script.src = this.props.src;

    script.onload = this.done;
    script.onerror = this.fail;

    document.body.appendChild(script);
  },

  /**
   * Creates a gun instance and exports it as `gun`.
   * @return {undefined}
   */
  setupGun: function () {
    let Gun;

    if (typeof window === 'undefined') {
      Gun = require(this.props.gunPath);
    } else {
      Gun = window.Gun;
    }

    const gun = Gun(this.props);
    this.set('gun', gun);

    this.set('file', this.props.file || 'data.json');
  },

  /**
   * Starts a gun server.
   * @param  {Object} job - Job context.
   * @return {String} - The full URL of the server.
   */
  setupGunServer: function (job) {
    const http = require('http');
    const fs = require('fs');
    const addr = require('ip').address();
    const gun = this.get('gun');

    const port = this.props.port;

    const server = new http.Server();
    this.set('server', server);

    server.on('request', function (req, res) {
      const path = job.props.routes[req.url];

      if (path) {
        fs.createReadStream(path).pipe(res);
      }
    });

    gun.wsp(server);

    server.listen(port);

    return `http://${addr}:${port}`;
  },

  /**
   * Saves variable amounts of data into gun at a variable interval.
   * @param  {Object} job - The job context.
   * @return {undefined}
   */
  sendMessages: function (job) {
    this.async();

    const gun = job.get('gun');
    const key = this.props.key;
    const ref = gun.get(key);

    let messages = 0;

    const interval = setInterval(function () {
      ref.path(messages).put(key);
      messages += 1;

      if (messages >= job.props.messages) {
        clearInterval(interval);
        job.done();
      }
    }, job.props.interval || Infinity);
  },

  removeFiles: function () {
    const fs = require('fs');
    const files = this.props.files;

    files.forEach(function (file) {
      try {
        fs.unlinkSync(file);
      } catch (err) {
        // Might not have saved at all.
      }
    });
  },

  waitForAllData: function (job) {
    this.async();

    const gun = this.get('gun');
    const platforms = this.props.platforms;

    function getGraph (gun) {
      return (gun.__ || gun._).graph;
    }

    function hasData (graph) {
      const counts = {};

      Object.keys(graph)

      // Get the nodes.
      .map(function (key) {
        const node = graph[key];
        return node;
      })

      // Get all the values from the nodes.
      .map(function (node) {
        const keys = Object.keys(node);

        return keys.map(function (key) {
          const value = node[key];
          return value;
        });

      })

      // Create a list of all node values.
      .reduce(function (sum, arr) {
        return sum.concat(arr);
      }, [])

      // Track how many times we've seen a value.
      .forEach(function (id) {
        counts[id] = counts[id] || 0;

        counts[id] += 1;
      });

      // The platform ID should show up for every message it saves.
      const missing = platforms.some(function (setting) {
        return counts[setting.key] !== setting.messages;
      });

      return !missing;
    }

    const interval = setInterval(function () {
      const graph = getGraph(gun);
      const done = hasData(graph);

      if (done) {
        clearInterval(interval);
        job.done();
      }
    }, 50);
  },

};
