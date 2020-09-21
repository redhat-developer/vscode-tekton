/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as cytoscape from 'cytoscape';
import { NodeOrEdge, CyTheme, NodeData } from './model';
import * as dagre from 'cytoscape-dagre';
import { debounce } from 'debounce';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();
cytoscape.use(dagre); // register extension

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
    case 'highlightNode':
      highlightNode(event.data.data);
      break;
    case 'removeHighlight':
      removeHighlight();
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

let previousHighlightNode: cytoscape.CollectionReturnValue;
function removeHighlight(): void {
  if (previousHighlightNode) {
    previousHighlightNode.data('editing', 'false');
    previousHighlightNode = undefined;
  }
}
function highlightNode(nodeId: string): void {
  removeHighlight();
  previousHighlightNode = cy.$(`#${nodeId}`);
  previousHighlightNode.data('editing', 'true');
}

function startUpdatingState(): void {
  cy.on('render', () => saveState());
  cy.on('tap', 'node', function (evt) {
    const node: NodeData = evt.target.data();
    if (node.yamlPosition) {
      vscode.postMessage({
        type: 'onDidClick',
        body: node
      });
    }
  });
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
      padding: 20, // fit padding
      animate: false,
      nodeSep: 50,
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
        'color': style.labelColor,
        'font-family': style.fontFamily,
        'font-size': style.fontSize,
        'curve-style': 'taxi',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': style.arrowColor,
      }
    },
    {
      selector: 'edge[state = "Cancelled"]',
      style: {
        'width': 3,
        'line-color': 'red',
        'curve-style': 'bezier',
        'target-arrow-shape': 'diamond',
        'target-arrow-color': 'red',
      }
    },
    {
      selector: 'node',
      style: {
        'background-color': 'grey',
        'background-fit': 'contain',
        'label': 'data(label)',
        'font-size': style.fontSize,
        'text-wrap': 'wrap',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#d4d4d4',
        'width': 150,
        'height': 30
      }
    },
    {
      selector: 'node[type = "Task"]',
      style: {
        'shape': 'round-rectangle',
      },
    },
    {
      selector: 'node[type = "ClusterTask"]',
      style: {
        'shape': 'round-rectangle',
      },
    },
    {
      selector: 'node[type = "Condition"]',
      style: {
        'shape': 'diamond',
        'width': 20,
        'height': 20,
        'text-wrap': 'wrap',
        'text-valign': 'center',
        'text-halign': 'left',
        'color': style.labelColor,
      },
    },
    {
      selector: 'node[?final]',
      style: {
        'shape': 'diamond',
      },
    },
    {
      selector: 'node[state = "Started"]',
      style: {
        'background-color': '#1471f4',
      }
    },
    {
      selector: 'node[state = "Cancelled"]',
      style: {
        'background-color': 'grey',
      }
    },
    {
      selector: 'node[state = "Failed"]',
      style: {
        'background-color': 'red',
      }
    },
    {
      selector: 'node[state = "Finished"]',
      style: {
        'background-color': '#38812f',
      }
    },
    {
      selector: 'node[state = "Unknown"]',
      style: {
        'background-color': 'grey',
      }
    },
    {
      selector: 'node[editing = "true"]',
      style: {
        'border-color': 'green',//style.arrowColor,
        'border-width': 2
      }
    },
  ];
}
