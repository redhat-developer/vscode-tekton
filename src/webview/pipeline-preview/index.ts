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
import * as cxtmenu from 'cytoscape-cxtmenu';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();
cytoscape.use(dagre); // register extension
cytoscape.use(popper);
cytoscape.use(cxtmenu);

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

  const theme = getTheme();

  // the default values of each option are outlined below:
  const defaults = {
    menuRadius: function(){ return 50; }, // the outer radius (node center to the end of the menu) in pixels. It is added to the rendered size of the node. Can either be a number or function as in the example.
    selector: 'node[taskRunName]', // elements matching this Cytoscape.js selector will trigger cxtmenus
    commands: [ // an array of commands to list in the menu or a function that returns the array
    
      { // example command
        // fillColor: 'rgba(200, 200, 200, 0.75)', // optional: custom background color for item
        content: 'Show logs', // html/text content to be displayed in the menu
        contentStyle: {}, // css key:value pairs to set the command's css in js if you want
        select: function(ele){ // a function to execute when the command is selected
          console.error(ele.data().taskRunName) // `ele` holds the reference to the active element
          vscode.postMessage({
            type: 'showTaskLog',
            body: ele.data().taskRunName
          });
        },
        enabled: true // whether the command is selectable
      }
    
    ], // function( ele ){ return [ /*...*/ ] }, // a function that returns commands or a promise of commands
    fillColor: theme.menuBackgroundColor,//'rgba(0, 0, 0, 0.75)', // the background colour of the menu
    activeFillColor: theme.menuSelectionColor,//'rgba(1, 105, 217, 0.75)', // the colour used to indicate the selected command
    activePadding: 0, // additional size in pixels for the active command
    indicatorSize: 24, // the size in pixels of the pointer to the active command, will default to the node size if the node size is smaller than the indicator size, 
    separatorWidth: 3, // the empty spacing in pixels between successive commands
    spotlightPadding: 4, // extra spacing in pixels between the element and the spotlight
    adaptativeNodeSpotlightRadius: true, // specify whether the spotlight radius should adapt to the node size
    minSpotlightRadius: 24, // the minimum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
    maxSpotlightRadius: 38, // the maximum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
    openMenuEvents: 'cxttapstart taphold', // space-separated cytoscape events that will open the menu; only `cxttapstart` and/or `taphold` work here
    itemColor: 'white', // the colour of text in the command's content
    itemTextShadowColor: 'transparent', // the text shadow colour of the command's content
    zIndex: 9999, // the z-index of the ui div
    atMouse: false, // draw menu at mouse position
    outsideMenuCancel: 2 // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given 
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (cy as any).cxtmenu( defaults );
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
  result.menuBackgroundColor = getComputedStyle(document.body).getPropertyValue('--vscode-menu-background');
  result.menuSelectionColor = getComputedStyle(document.body).getPropertyValue('--vscode-menu-selectionBackground');
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
