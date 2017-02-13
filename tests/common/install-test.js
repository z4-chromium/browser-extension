'use strict';

var proxyquire = require('proxyquire');

var extension;

function FakeHypothesisChromeExtension(args) {
  extension = this; // eslint-disable-line consistent-this

  this.args = args;
  this.listen = sinon.stub();
  this.install = sinon.stub();
  this.firstRun = sinon.stub();
}

function eventListenerStub() {
  return {
    addListener: sinon.stub(),
  };
}

describe('install', function () {
  var origChrome;
  var fakeChrome;

  beforeEach(function () {
    fakeChrome = {
      tabs: {},
      browserAction: {},
      storage: {},
      extension: {
        getURL: sinon.stub(),
        isAllowedFileSchemeAccess: sinon.stub(),
      },
      contentSettings: {
        cookies: { set: sinon.stub() },
        images: { set: sinon.stub() },
        javascript: { set: sinon.stub() },
      },
      runtime: {
        requestUpdateCheck: sinon.stub(),
        onInstalled: eventListenerStub(),
        onMessageExternal: eventListenerStub(),
        onUpdateAvailable: eventListenerStub(),
      },
      management: {
        getSelf: function (cb) {
          cb({installType: 'normal', id: '1234'});
        },
      },
    };

    origChrome = window.chrome;
    window.chrome = fakeChrome;

    proxyquire('../../src/common/install', {
      './hypothesis-chrome-extension': FakeHypothesisChromeExtension,
      './settings': {
        serviceUrl: 'https://hypothes.is/',
      },
    });
  });

  afterEach(function () {
    window.chrome = origChrome;
  });

  context('when the extension is installed', function () {
    function triggerInstallEvent() {
      var cb = fakeChrome.runtime.onInstalled.addListener.args[0][0];
      cb({reason: 'install'});
    }

    it("calls the extension's first run hook", function () {
      triggerInstallEvent();
      assert.calledWith(extension.firstRun, {id: '1234', installType: 'normal'});
    });

    it('enables extension to set cookies for service domain', function () {
      triggerInstallEvent();
      assert.calledWith(fakeChrome.contentSettings.cookies.set, {
        primaryPattern: 'https://hypothes.is/*',
        setting: 'allow',
      });
    });
  });
});
