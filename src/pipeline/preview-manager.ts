/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { TextDocument, ViewColumn } from 'vscode';
import { PipelinePreview } from './preview';


export interface PreviewSettings {
    readonly resourceColumn: ViewColumn;
    readonly previewColumn: ViewColumn;
}


export class PreviewManager {

    private previews = new Map<string, PipelinePreview>();
    private activePreview: PipelinePreview | undefined = undefined;

    showPreview(document: TextDocument, settings: PreviewSettings): void {
      let preview = this.previews.get(document.uri.toString());
      if (preview) {
        preview.reveal(settings.previewColumn);
      } else {
        preview = this.createTektonPreview(document, settings);
      }

      preview.update(document);
    }

    createTektonPreview(document: TextDocument, settings: PreviewSettings): PipelinePreview {
      const preview = PipelinePreview.create(
        {
          document,
          resourceColumn: settings.resourceColumn,
        },
        settings.previewColumn);

      this.setPreviewActiveContext(true);
      this.activePreview = preview;
      return this.registerDynamicPreview(document.uri.toString(), preview);
    }

    private registerDynamicPreview(uri: string, preview: PipelinePreview): PipelinePreview {
      this.previews.set(uri, preview);

      preview.onDispose(() => {
        this.previews.delete(uri);
      });

      this.trackActive(preview);

      preview.onDidChangeViewState(() => {
        // Remove other dynamic previews in our column
        // disposeAll(Array.from(this._dynamicPreviews).filter(otherPreview => preview !== otherPreview && preview.matches(otherPreview)));
      });
      return preview;
    }

    private trackActive(preview: PipelinePreview): void {
      preview.onDidChangeViewState(({ webviewPanel }) => {
        this.setPreviewActiveContext(webviewPanel.active);
        this.activePreview = webviewPanel.active ? preview : undefined;
      });

      preview.onDispose(() => {
        if (this.activePreview === preview) {
          this.setPreviewActiveContext(false);
          this.activePreview = undefined;
        }
      });
    }

    private setPreviewActiveContext(value: boolean): void {
      // vscode.commands.executeCommand('setContext', MarkdownPreviewManager.markdownPreviewActiveContextKey, value);
      //TODO: implement this
    }

}

export const previewManager = new PreviewManager();
