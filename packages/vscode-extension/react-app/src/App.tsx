import * as React from 'react';
/*import './App.css';
import '../style/trace-viewer.css';
import '../style/trace-context-style.css';
import '../style/output-components-style.css';
import '../style/trace-explorer.css';
import '../style/status-bar.css';*/
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { TraceContextComponent } from '@tracecompass/react-components/lib/components/trace-context-component';
//import { VsCodeSignalHandler } from './vscode-signal-handler';
//import { TraceContextComponent } from '../trace-viewer/trace-context-component';


//const logo = require("../logo.svg") as string;

interface TraceContextProps {
}

interface TraceContextState {
  experiment: Experiment | undefined;
  tspClient: TspClient | undefined;
  outputs: OutputDescriptor[];
}

class App extends React.Component<TraceContextProps, TraceContextState>  {
  //private _signalHandler: VsCodeSignalHandler;

  constructor(props: TraceContextProps) {
    super(props);
    this.state = {
      experiment: undefined,
      tspClient: undefined,
      outputs: []
    };
    //this._signalHandler = new VsCodeSignalHandler;
    window.addEventListener('message', event => {

      const message = event.data; // The JSON data our extension sent
      switch (message.command) {
        case "set-experiment":
          this.setState({experiment: message.data as Experiment});
          break;
        case "set-tspClient":
          // TODO Pass only the URL instead of weak typing here
          this.setState({tspClient: new TspClient(message.data.baseUrl)});
          break;
        case "add-output":
          console.log("Adding outputs", message.data);
          this.setState({outputs: [...this.state.outputs, message.data] });
          break;
      }
    });
    this.onOutputRemoved = this.onOutputRemoved.bind(this);
  }

  private onOutputRemoved(outputId: string) {
    const outputToKeep = this.state.outputs.filter(output => output.id !== outputId);
    this.setState({outputs: outputToKeep});
  }

  public render() {
    return (
      <div className="App">
        { this.state.experiment && this.state.tspClient && <TraceContextComponent 
          experiment={this.state.experiment} 
          tspClient={this.state.tspClient} 
          outputs={this.state.outputs}
          onOutputRemove={this.onOutputRemoved}></TraceContextComponent>
        }
      </div>
    ); 
    return (
        <h1>Hello</h1>
      );
  }
}

export default App;