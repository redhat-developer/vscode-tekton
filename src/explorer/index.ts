import { Disposable, window } from 'vscode';
import {PipelineTreeDataProvider} from './provider';
import { PipelineModel } from './model';


function createPipelineExplorer(): Disposable[] {
  const pipelineModel = new PipelineModel();
  const pipelineProvider = new PipelineTreeDataProvider(pipelineModel);
  return [
    window.registerTreeDataProvider('tekton.pipelineExplorer',pipelineProvider)
  ];
}

export{
  createPipelineExplorer
};
