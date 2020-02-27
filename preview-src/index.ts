/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as cytoscape from 'cytoscape';
import { NodeOrEdge } from './model';
import * as dagre from 'cytoscape-dagre';
import { debounce } from 'debounce';

declare let acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();
cytoscape.use(dagre); // register extension


let images: { [id: string]: string };
let cy: cytoscape.Core;
const saveState = debounce(()=> {
  vscode.setState(cy.json());
}, 1000)

// Check if we have an old state to restore from
const previousState = vscode.getState();
if (previousState) {
  restore(previousState);
}


window.addEventListener('message', event => {

  switch (event.data.type) {
    case 'showData':
      showData(event.data.data);
      break;
    case 'images':
      images = event.data.data;
      break;
  }
}, false);


function showData(data: NodeOrEdge[]): void {

  render(data);
}

function startUpdatingState(): void {
  cy.on('render', () => saveState());
}

function restore(state: any): void {
  cy = cytoscape({ container: document.getElementById('cy') });
  cy.json(state);
  startUpdatingState();
}

function render(data: NodeOrEdge[]): void {
  const labelColor = getComputedStyle(document.body).getPropertyValue('color');
  const backgroundColor = getComputedStyle(document.body).getPropertyValue('background-color');
  const fontSize = getComputedStyle(document.body).getPropertyValue('font-size');
  const fontFamily = getComputedStyle(document.body).getPropertyValue('font-family');
  const arrowColor = getComputedStyle(document.documentElement).getPropertyValue('--vscode-notificationLink-foreground');
  cy = cytoscape({
    container: document.getElementById('cy'), // container to render in
    elements: data,

    style: [ // the stylesheet for the graph
      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': arrowColor,
          'curve-style': 'bezier',
          'target-arrow-shape': 'triangle',
          'target-arrow-color': arrowColor,
        }
      },
      {
        selector: 'node',
        style: {
          'background-color': backgroundColor,
          'background-fit': 'contain',
          'label': 'data(name)',
          'font-size': fontSize,
          'text-wrap': 'wrap',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'color': labelColor,
          'font-family': fontFamily,
        }
      },
      {
        selector: 'node[type = "Task"]',
        style: {
          'background-image': images['task'],
          'shape': 'rectangle',
        },
      },
      {
        selector: 'node[type = "ClusterTask"]',
        style: {
          'background-image': images['clustertask'],
          'shape': 'round-rectangle',
        },
      }
    ],

    layout: {
      name: 'dagre',
      fit: true, // whether to fit to viewport
      padding: 30, // fit padding
      animate: false,
      nodeSep: 100,
    } as any, // to make TSC happy, there are no typings for cytoscape-dagre plugin
    headless: false,
  });

  startUpdatingState();
}

// const cy = cytoscape({
//     container: document.getElementById('cy'), // container to render in
//     elements: [ // list of graph elements to start with
//         { // node a
//             data: { id: 'a', 'type': 'round-rectangle' }
//         },
//         { // node b
//             data: { id: 'b', 'type': 'diamond' }
//         },
//         { // edge ab
//             data: { id: 'ab', source: 'a', target: 'b' }
//         }
//     ],

//     style: [ // the stylesheet for the graph
//         {
//             selector: 'node',
//             style: {
//                 'background-color': 'red',
//                 'label': 'data(id)',
//                 'shape': 'data(type)',
//             }
//         },

//         {
//             selector: 'edge',
//             style: {
//                 'width': 3,
//                 'line-color': '#ccc',
//                 'curve-style': 'bezier',
//                 'target-arrow-shape': 'triangle',
//                 'target-arrow-color': '#ccc'
//             }
//         }
//     ],

//     layout: {
//         name: 'grid',
//         rows: 1
//     }
// });
