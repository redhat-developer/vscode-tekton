/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as taskTest from './suite/task-test';
import * as tektonViewTest from './suite/tekton-view-test';
import * as extensionActivityTest from './public-suite/extension-activity-test';
import * as commandPaletteTest from './public-suite/command-palette-test';
import * as extensionViewTest from './public-suite/extension-view-test';

describe('VSCode Tekton UI Tests Suite', () => {
  const clusterUrl = process.env.CLUSTER_URL || 'https://api.openshift4.cluster.adapters-crs-qe.com:6443';
  const username = process.env.CLUSTER_USER || 'kubeadmin';
  const password = process.env.CLUSTER_PASSWORD || 'password';

  tektonViewTest.tektonViewTest(clusterUrl, username, password);
  taskTest.taskTest(clusterUrl, username, password);

  commandPaletteTest.commandPaletteTest()
  extensionActivityTest.extensionActivityTest();
  extensionViewTest.extensionViewTest();
});

