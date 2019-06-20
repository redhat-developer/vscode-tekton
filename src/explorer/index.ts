import { Disposable, window, commands } from 'vscode';
import {PipelineExplorer} from '../pipeline/pipelineExplorer';
import { PipelineModel } from './model';


function createPipelineExplorer(): Disposable[] {
  const pipelineModel = new PipelineModel();
  return new PipelineExplorer(pipelineModel);
}

export{
  createPipelineExplorer
};
