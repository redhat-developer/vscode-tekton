/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as cytoscape from 'cytoscape';
import { NodeOrEdge, CyTheme } from './model';
import * as dagre from 'cytoscape-dagre';
import { debounce } from 'debounce';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();
cytoscape.use(dagre); // register extension


let images: { [id: string]: string };
let cy: cytoscape.Core;
const saveState = debounce(() => {
  vscode.setState(cy.json());
}, 1500)

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

const observer = new MutationObserver(m => {
  for (const mutation of m) {
    if (mutation.attributeName === 'class') {
      updateStyle();
    }
  }
});

observer.observe(document.body, { attributeFilter: ['class'] });


function showData(data: NodeOrEdge[]): void {
  render(data);
}

function startUpdatingState(): void {
  cy.on('render', () => saveState());
}

function restore(state: object): void {
  cy = cytoscape({ container: document.getElementById('cy') });
  cy.json(state);
  startUpdatingState();
}

function render(data: NodeOrEdge[]): void {

  cy = cytoscape({
    container: document.getElementById('cy'), // container to render in
    elements: data,

    style: getStyle(getTheme()),

    layout: {
      name: 'dagre',
      fit: true, // whether to fit to viewport
      padding: 30, // fit padding
      animate: false,
      nodeSep: 100,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any, // to make TSC happy, there are no typings for cytoscape-dagre plugin
    headless: false,
  });

  startUpdatingState();
}

function updateStyle(): void {
  const style = getStyle(getTheme());
  if (cy) {
    cy.style(style);
  }
}

function getTheme(): CyTheme {
  const result = {} as CyTheme;

  result.labelColor = getComputedStyle(document.body).getPropertyValue('color');
  result.backgroundColor = getComputedStyle(document.body).getPropertyValue('background-color');
  result.fontSize = getComputedStyle(document.body).getPropertyValue('font-size');
  result.fontFamily = getComputedStyle(document.body).getPropertyValue('font-family');
  result.arrowColor = getComputedStyle(document.documentElement).getPropertyValue('--vscode-editor-selectionBackground');

  return result;
}

function getStyle(style: CyTheme): cytoscape.Stylesheet[] {
  return [ // the stylesheet for the graph
    {
      selector: 'edge',
      style: {
        'width': 3,
        'line-color': style.arrowColor,
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': style.arrowColor,
      }
    },
    {
      selector: 'node',
      style: {
        'background-color': style.backgroundColor,
        'background-fit': 'contain',
        'label': 'data(name)',
        'font-size': style.fontSize,
        'text-wrap': 'wrap',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'color': style.labelColor,
        'font-family': style.fontFamily,
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
  ];
}
