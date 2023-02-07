/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
export namespace commands {
  //General commands
  export const VERSION = 'Tekton: Tekton Version';
  export const REFRESH = 'Tekton: Refresh View';
  export const SHOW_OUTPUT_CHANNEL = 'Tekton: Show Output Channel';

  //Tasks related commands
  export const START_TASK = 'Tekton: Start Task';
  export const LIST_TASK_RUN = 'Tekton: List TaskRuns from Task';
  export const SHOW_TASK_RUN_LOGS = 'Tekton: Show Task Run Logs';
}

export namespace views {
  export const TEKTON_TITLE = 'Tekton Pipelines';
  export const TEKTON_CATS = [TEKTON_TITLE, 'Debug Sessions', 'TektonHub'];
}
