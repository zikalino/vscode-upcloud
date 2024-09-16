import * as vscode from 'vscode';
import YAML from 'yaml';
import { marked } from 'marked';
import * as helpers from '@zim.kalinowski/vscode-helper-toolkit';

import { parseCmdGroup } from './help-parser';

//import SwaggerParser from "@apidevtools/swagger-parser";
var extensionUri: vscode.Uri;
var mediaFolder: vscode.Uri;
var extensionContext: vscode.ExtensionContext;

const fs = require("fs");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate (context: vscode.ExtensionContext) {
  extensionContext = context;
  extensionUri = context.extensionUri;

  mediaFolder = vscode.Uri.joinPath(extensionUri, 'media');

  // let disposable = vscode.commands.registerCommand('vscode-azure.displayInstallerWelcome', () => {
  //  displayInstallerWelcome();
  //});

  let disposable = vscode.commands.registerCommand(
    'vscode-azure.displayPrerequisitesView',
    () => {
      displayPrerequisitesView();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-azure.displayCreateResource',
    () => {
      displayResourceCreateView();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-azure.displayAzureApiBrowser',
    () => {
      parseApi();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-azure.displayCmdHelpParser',
    () => {
      parseCommands();
    }
  );


  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate () {}


var layoutWelcome: any = require('./layout-welcome.yaml');

async function displayInstallerWelcome() {
  try {
    let view = new helpers.GenericWebView(extensionContext, "Welcome!");
    view.createPanel(layoutWelcome);
  } catch (e) {
    console.log(e);
  }
}

var layoutSetup: any = require('./layout-setup.yaml');

async function displayPrerequisitesView() {
  let view = new helpers.GenericWebView(extensionContext, "Installer");
  view.createPanel(layoutSetup);

  view.MsgHandler = function (msg: any) {
    if (msg.command === 'ready') {
      // XXX - this is just temporary solution until extension is in stable state
      if (process.platform === "win32") {
        view.showElement('fieldset_esp_idf');
        view.hideElement("fieldset_tinygo");
        view.hideElement('fieldset_rust');
        view.hideElement('fieldset_zephyr');
      } else {
        view.hideElement('fieldset_esp_idf');
        view.hideElement("fieldset_tinygo");
        view.hideElement('fieldset_rust');
        view.showElement('fieldset_zephyr');
      }
      view.runStepsVerification();
    } else if (msg.command === 'button-clicked') {
      //vscode.window.showInformationMessage('Button ' + msg.id + ' Clicked!');
      if (msg.id === 'close') {
        view.close();
      } else if (msg.id === 'install_button') {
        view.runStepsInstallation();
      }
    } else if (msg.command === 'radio-clicked') {
      vscode.window.showInformationMessage('Radio ' + msg.id + ' Clicked!');
    } else if (msg.command === 'dropdown-clicked') {
      if (msg.combo_id === 'sdk_type') {
        // vscode.window.showInformationMessage('Dropdown item ' + msg.id + ' Clicked X!');

        view.hideElement("fieldset_tinygo");
        view.hideElement('fieldset_esp_idf');
        view.hideElement('fieldset_rust');
        view.hideElement('fieldset_zephyr');

        if (msg.id === 'ESP-IDF') {
          // XXX - show ESP-IDF version
          view.showElement('fieldset_esp_idf');
        } else if (msg.id === 'TinyGo') {
          view.showElement("fieldset_tinygo");
        } else if (msg.id === 'Zephyr') {
          view.showElement("fieldset_zephyr");
        } else if (msg.id === 'Rust') {
          view.showElement("fieldset_rust");
        } else {
          view.enableElement('create-button');
        }
        view.runStepsVerification();
      }
    }
  };

}

async function parseCommands() {
  let response = await parseCmdGroup("az");
  loadYamlView(loadYaml(response));
}

async function displayResourceCreateView() {
  let menu: any = loadYaml(extensionContext.extensionPath + "/defs/___menu.yaml");
  displayMenu(menu);
}

async function displayMenu(submenu: any) {
  var selected: string[] = [];
  for (var i in submenu) {
    selected.push(submenu[i].name);
  }

  const result = await vscode.window.showQuickPick(selected, {
    placeHolder: 'Select...'
  });

  for (var i in submenu) {
    if (submenu[i].name === result) {
      if ('submenu' in submenu[i]) {
        displayMenu(submenu[i].submenu);
      } else {
        // XXX - load yaml
        let yml = loadYaml(extensionContext.extensionPath + "/defs/" + submenu[i].location);
        loadYamlView(yml);
      }
    }
  }

}

async function loadYamlView(yml: string) {
  let view = new helpers.GenericWebView(extensionContext, "New Resource"); 
  view.createPanel(yml);

  view.MsgHandler = function (msg: any) {
    if (msg.command === 'ready') {
      view.runStepsVerification();
    } else if (msg.command === 'button-clicked') {
      //vscode.window.showInformationMessage('Button ' + msg.id + ' Clicked!');
      if (msg.id === 'close') {
        view.close();
      } else if (msg.id === 'install_button') {
        view.runStepsInstallation();
      }
    }
  };
}


async function parseApi() {
  let api = await SwaggerParser.parse("c:\\Users\\Lenovo\\azure-rest-api-specs\\specification\\resources\\resource-manager\\Microsoft.Resources\\stable\\2024-03-01\\resources.json");
  console.log("API name: %s, Version: %s", api.info.title, api.info.version);
}

// XXX - perhaps this should be moved to helpers
function loadYaml(location: string) : any {
  // extensionContext.extensionPath + "/defs/" + result + ".yaml"
  let y = fs.readFileSync(location, "utf8");
  y = YAML.parse(y);
  loadIncludes(y);
  return y;
}

function loadIncludes(data: any) {

  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      for (let i = data.length - 1; i >= 0; i--) {

        if ((typeof data[i] === 'object') && ('$include' in data[i])) {
          var prefix = undefined;
          if ('prefix' in data[i]) {
            prefix = data[i]['prefix'];
          }
          var showif = undefined;
          if ('show-if' in data[i]) {
            showif = data[i]['show-if'];
          }

          var included = loadYaml(extensionContext.extensionPath + "/defs/" + data[i]['$include']);

          // apply prefix
          if (prefix !== undefined) {
            applyPrefix(included, prefix);
          }

          if (typeof included === 'object') {
            if (Array.isArray(included)) {

              if (showif !== undefined) {
                for (var j = 0; j < included.length; j++) {
                  included[j]['show-if'] = showif;
                }
              }

              // insert several elements
              data.splice(i, 1, ...included);
            } else {
              if (showif !== undefined) {
                included['show-if'] = showif;
              }
              // just replace this entry with new dictionary
              data[i] = included;
            }
          }
        } else {
          loadIncludes(data[i]);
        }
      }
    }
    else {
      if ('@include' in data) {
        // XXX - load this include
        var included = loadYaml(extensionContext.extensionPath + "/defs/" + data['location']);
        data.clear();
        for (var k in included) {
          data[k] = included[k];
        }
      }

      for (let key in data) {
        if (typeof data[key] === 'object') {
          loadIncludes(data[key]);
        }
      }
    }
  }
}

function applyPrefix(data: any, prefix: string) {
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      for (let i = data.length - 1; i >= 0; i--) {
        applyPrefix(data[i], prefix);
      }
    }
    else {
      for (let key in data) {
        if (typeof data[key] === 'object') {
          if (key === 'produces') {
            var produces = data['produces'];
            for (let i = 0; i < produces.length; i++) {
              if ('variable' in produces[i]) {
                produces[i]['variable'] = prefix + produces[i]['variable'];
              }
            }
          } else {
            applyPrefix(data[key], prefix);
          }
        }
      }
    }
  }
}
