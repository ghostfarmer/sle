'use babel';

import SleView from './sle-view';
import { CompositeDisposable } from 'atom';
import path from 'path';

export default {

  sleView: null,
  modalPanel: null,
  subscriptions: null,
  config:{
    userName:{
      title: 'User Name',
      description: 'User name to connect to SM',
      type: 'string',
      default: 'falcon'
    },
    pass:{
      title: 'Password',
      description: 'Password',
      type: 'string',
      default: ''
    },
    port:{
      title: 'RTE port',
      description: 'The port to rest api',
      type: 'string',
      default: '13080'
    }
  },

  activate(state) {
    this.sleView = new SleView(state.sleViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.sleView.getElement(),
      visible: false
    });

    //connection
    this.rootUrl = 'http://localhost:' + atom.config.get('sle.port') + '/';
    this.rootApi = this.rootUrl + 'SM/9/rest/slexxx/xxx/action/';
    this.headers = new Headers({
      'Content-Type':'application/json',
      'Authorization':'Basic ZmFsY29uOg=='
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();
    this.editorSubscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.registerCommands();
    this.registerEditor();
  },

  deactivate() {
    this.modalPanel.destroy();
    this.editorSubscriptions.dispose();
    this.subscriptions.dispose();
    this.sleView.destroy();
  },

  serialize() {
    return {
      sleViewState: this.sleView.serialize()
    };
  },

  registerCommands(){
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'sle:pullAll': () => this.pullAll()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'sle:execute': () => this.execute()
    }));
  },

  registerEditor(){
    this.editorSubscriptions.add(atom.workspace.observeTextEditors((editor)=>{
      this.subscriptions.add(editor.onDidSave(()=>{
        this.updateOne(
          {
            name: editor.getTitle().slice(0,-3),
            script: editor.getText(),
            package: editor.getBuffer().file.getParent().getBaseName(),
            sysrestricted: false
          }
        );
      }))
    }));

  },

  pullAll() {
    console.log('Sle was toggled!');
    var rootDir = atom.project.rootDirectories[0].path;
    var body = {
      'slexxx': {
        'script': rootDir
      }
    };

    var url = this.rootApi + 'pullall';

    var headers = this.headers;
    var options = {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    }
    this.modalPanel.show();

    fetch(url, options)
      .then((response)=>{
        return response.json();
      })
      .then((data)=>{
        var packageCount = data.Messages.length;
        this.modalPanel.hide();
        let msg = 'Pull Finished, '+packageCount+' Packages Pulled.';
        atom.notifications.addInfo(msg);
      })
      .catch((er)=>{
        this.modalPanel.hide();
        let msg = 'Pull Failed \n'+ JSON.stringify(er);
        atom.notifications.addError(msg);
      })

  },

  updateOne(data){
    var body = {
      'slexxx': data
    };
    var url = this.rootUrl + 'SM/9/rest/slexxx/'+data.name+'/action/save';
    var headers = this.headers;

    var options = {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    };

    atom.notifications.addInfo('Saving File ' + data.name + ' to SM...');
    fetch(url, options)
      .then((response)=>{
        return response.json();
      })
      .then((data)=>{
        atom.notifications.addInfo('Saving Success!');
      })
      .catch((error)=>{
        var msg = JSON.stringify(error);
        atom.notifications.addError(msg);
      });

  },

  execute(){
    var editor = atom.workspace.getActiveTextEditor();
    var name = (path.parse(editor.getTitle())).name;
    var body = {
      'slexxx':{
        name: name
      }
    };

    var url = this.rootApi + 'execute';
    var headers = this.headers;
    var options = {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    };
    fetch(url, options)
      .then((response)=>response.json())
      .then((data)=>{
        var msg = data.Messages.join('\n');
        atom.notifications.addInfo(msg);
      })
      .catch((error)=>{
        var msg = JSON.stringify(error);
        atom.notifications.addError(msg);
      });
  }


};
