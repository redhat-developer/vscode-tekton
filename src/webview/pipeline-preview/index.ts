/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as cytoscape from 'cytoscape';
import { NodeOrEdge, CyTheme, NodeData, StepData } from './model';
import * as dagre from 'cytoscape-dagre';
import { debounce } from 'debounce';
import * as popper from 'cytoscape-popper';
import { TaskPopup } from './task-popup';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();
cytoscape.use(dagre); // register extension
cytoscape.use(popper);

let cy: cytoscape.Core;
const saveState = debounce(() => {
  vscode.setState(cy.json());
}, 1500)

// Check if we have an old state to restore from
const previousState = vscode.getState();
if (previousState) {
  restore(previousState);
}

let highlightedSourceEdges: cytoscape.EdgeCollection;
let highlightedTargetEdges: cytoscape.EdgeCollection;
let taskInfoPopup: TaskPopup;
let hoveredId: string;

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
    case 'showSteps':
      showSteps(event.data.data);
      break;
    default:
      console.error(`Cannot handle: ${event.data.type}!`);
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
function showSteps(steps: StepData[] | undefined): void {
  if (taskInfoPopup) {
    taskInfoPopup.setSteps(steps);
  }
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

  cy.on('pan zoom resize', () => {
    if (taskInfoPopup) {
      taskInfoPopup.update();
    }
  });

  cy.on('mouseover', 'node', (e) => {
    const node = e.target;
    const sourceEdges = node.connectedEdges(`edge[source = "${node.data().id}"]`);
    const targetEdges = node.connectedEdges(`edge[target = "${node.data().id}"]`);
    const theme = getTheme();
    sourceEdges.select();
    highlightedSourceEdges = sourceEdges;
    highlightedTargetEdges = targetEdges;
    sourceEdges.style('line-color', theme.sourceEdgesColor);
    sourceEdges.style('target-arrow-color', theme.sourceEdgesColor);
    sourceEdges.style('z-index', '100');

    targetEdges.style('line-color', theme.targetEdgesColor);
    targetEdges.style('target-arrow-color', theme.targetEdgesColor);
    targetEdges.style('z-index', '100');
    const nodeData = node.data();
    if (taskInfoPopup) {
      taskInfoPopup.hide();
      taskInfoPopup = undefined;
    }
    if (nodeData.steps) {
      taskInfoPopup = new TaskPopup(node);
      hoveredId = node.data().id;
    } else {
      if (nodeData.type !== 'Condition' && nodeData.type !== 'When') {
        taskInfoPopup = new TaskPopup(node);
        hoveredId = node.data().id;
        vscode.postMessage({
          type: 'getSteps',
          body: nodeData
        });
      }
    }
  });

  cy.on('mouseout', 'node', () => {
    if (highlightedSourceEdges) {
      highlightedSourceEdges.removeStyle('line-color');
      highlightedSourceEdges.removeStyle('z-index');
      highlightedSourceEdges.removeStyle('target-arrow-color');
    }
    if (highlightedTargetEdges) {
      highlightedTargetEdges.removeStyle('line-color');
      highlightedTargetEdges.removeStyle('z-index');
      highlightedTargetEdges.removeStyle('target-arrow-color');
    }
    if (taskInfoPopup) {
      taskInfoPopup.hide();
      taskInfoPopup = undefined;
    }
    hoveredId = undefined;
  });
}

function restore(state: object): void {
  cy = cytoscape({ container: document.getElementById('cy') });
  cy.json(state);
  startUpdatingState();
}

function render(data: NodeOrEdge[]): void {
  if (taskInfoPopup) {
    taskInfoPopup.hide();
    taskInfoPopup = undefined;
  }
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
  if (hoveredId) {
    const node = cy.$(`#${hoveredId}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    taskInfoPopup = new TaskPopup(node as any);
  }
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
  result.targetEdgesColor = getComputedStyle(document.body).getPropertyValue('--vscode-charts-yellow');
  result.sourceEdgesColor = getComputedStyle(document.body).getPropertyValue('--vscode-charts-green');
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
        'taxi-direction': 'downward',
        'taxi-turn': '50px',
        'taxi-turn-min-distance': 1,
        'edge-distances': 'node-position',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': style.arrowColor,
      } as unknown,
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
        'height': 40
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
      selector: 'node[type = "TaskSpec"]',
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
      selector: 'node[type = "When"]',
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
        'border-color': 'green',
        'border-width': 2
      }
    },
  ];
}
