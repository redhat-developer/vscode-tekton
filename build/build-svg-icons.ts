/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'fs-extra';
import * as svgTools from 'simple-svg-tools';
import { exit } from 'shelljs';

const icons = ['C.svg', 'TR.svg', 'PLR.svg'];
const stateToColor = {
  error: 'red',
  pending: 'grey'
};

const imagesPath = path.join(__dirname, '..', '..', 'images');
const destinationPath = path.join(__dirname, '..', '..', 'images', 'generated');
fs.ensureDirSync(destinationPath);


async function generateIcons(): Promise<void> {
  for (const icon of icons) {
    const iconPath = path.join(imagesPath, icon);
    if (fs.existsSync(iconPath)) {

      for (const state in stateToColor) {
        const color = stateToColor[state];
        fs.ensureDirSync(path.join(destinationPath, state));
        let svg = await svgTools.ImportSVG(iconPath);
        svg = await svgTools.SVGO(svg);
        svg = await svgTools.ChangePalette(svg, {
          '#38812f': color,
        });

        await svgTools.ExportSVG(svg, path.join(destinationPath, state, icon));
      }
    }
  }
}

generateIcons().then(() => exit(0));
