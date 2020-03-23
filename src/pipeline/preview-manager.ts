/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { TextDocument, ViewColumn } from 'vscode';
import { PipelinePreview } from './preview';
import { Disposable } from '../util/disposable';
import { calculatePipelineGraph, GraphProvider } from './pipeline-graph';


export interface PreviewSettings {
  readonly resourceColumn: ViewColumn;
  readonly previewColumn: ViewColumn;
  readonly graphProvider: GraphProvider;
}


export class PreviewManager extends Disposable {

  private previews = new Map<string, PipelinePreview>();
  private activePreview: PipelinePreview | undefined = undefined;

  constructor() {
    super();
  }

  showPipelinePreview(document: TextDocument, settings: PreviewSettings): void {
    let preview = this.previews.get(document.uri.toString());
    if (preview) {
      preview.reveal(settings.previewColumn);
    } else {
      preview = this.createPipelinePreview(document, settings);
    }

    preview.update(document);
  }

  createPipelinePreview(document: TextDocument, settings: PreviewSettings): PipelinePreview {
    const preview = PipelinePreview.create(
      {
        document,
        resourceColumn: settings.resourceColumn,
        graphProvider: settings.graphProvider,
      },
      settings.previewColumn);

    this.activePreview = preview;
    return this.registerPipelinePreview(document.uri.toString(), preview);
  }

  private registerPipelinePreview(uri: string, preview: PipelinePreview): PipelinePreview {
    this.previews.set(uri, preview);

    preview.onDispose(() => {
      this.previews.delete(uri);
    });

    this.trackActive(preview);
    return preview;
  }

  private trackActive(preview: PipelinePreview): void {
    preview.onDidChangeViewState(({ webviewPanel }) => {
      this.activePreview = webviewPanel.active ? preview : undefined;
    });

    preview.onDispose(() => {
      if (this.activePreview === preview) {
        this.activePreview = undefined;
      }
    });
  }

}

export const previewManager = new PreviewManager();
