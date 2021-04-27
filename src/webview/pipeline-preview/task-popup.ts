/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import {Instance as Popper} from '@popperjs/core';
import {NodeSingular} from 'cytoscape';
import { StepData } from './model';
import { BaseWidget} from '../common/widget';
import {createDiv} from '../common/dom-util';
import './popup.css';
import {humanizer} from '../../util/humanizer';

export class TaskPopup extends BaseWidget {
  private popper: Popper;

  constructor(private readonly node: NodeSingular & { popper(opts): Popper} ) {
    super();
    this.element = createDiv('popup-container');
    this.popper = this.node.popper({
      content: () => {
        const steps: StepData[] = node.data().steps;
        this.renderSteps(steps);
    
        document.body.appendChild(this.element);
    
        return this.element;
      },
      popper: {} // my popper options here
    });
    
    node.on('position', this.update.bind(this));
  }

  private getStateDescription(step: StepData): [string, string, string] {
    if (step.running) {
      return ['Running',undefined, `running for ${humanizer(Date.now() - Date.parse(step.running.startedAt))}`];
    }
    if (step.waiting) {
      return ['Waiting', `${step.waiting.reason}`, undefined];
    }

    if (step.terminated) {
      return ['Terminated',`${step.terminated.message ?? step.terminated.reason}`, `started ${humanizer(Date.now() - Date.parse(step.terminated.startedAt))} ago, finished in ${humanizer(Date.parse(step.terminated.finishedAt) - Date.parse(step.terminated.startedAt))}`];
    }

    return [undefined, undefined, undefined];
  }

  setSteps(steps: StepData[] | undefined): void {
    this.node.data().steps = steps;
    this.renderSteps(steps, false);
    this.update();
  }

  hide(): void {
    this.popper.destroy();
    this.element.remove();
  }

  update(zoom?: number): void {
    this.popper.update();
    // if (zoom) {
    //   this.element.style.zoom = '' + zoom;
    // }
  }

  private renderSteps(steps: StepData[], renderLoader = true): void {
    this.element.innerHTML = '';
    if (steps) {
      const stepsContainer = document.createElement('ol');
      stepsContainer.classList.add('steps-container');
      for (const step of steps) {
        const stepElement = document.createElement('li');
        const description = this.getStateDescription(step);
        let content = step.name;
        if (description[0]) {
          content += ` ${description[0]}`;
        }
        if (description[1]){
          content += ` with: ${description[1]}`;
        }
        if (description[2]){
          content += ` - ${description[2]}`
        }
        stepElement.textContent = content;
        stepsContainer.appendChild(stepElement);
      }
      const titleElement = createDiv();
      titleElement.textContent = 'Steps:'
      this.element.appendChild(titleElement);
      this.element.appendChild(stepsContainer);
    } else {
      if (renderLoader) {
        this.element.innerText = 'Loading...';
      } else {
        this.hide();
        // this.element.innerText = 'No steps!';
      }
    }
  }
}

