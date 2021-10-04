/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Platform } from './util/platform';
import { Archive } from './util/archive';
import { which } from 'shelljs';
import { DownloadUtil } from './util/download';
import hasha = require('hasha');
import * as vscode from 'vscode';
import * as path from 'path';
import * as fsex from 'fs-extra';
import { createCliCommand, cli } from './cli';
import semver = require('semver');
import configData = require('./tools.json');

export class ToolsConfig {

  public static tool: object = ToolsConfig.loadMetadata(configData, Platform.OS);

  public static loadMetadata(requirements, platform): object {
    const req = JSON.parse(JSON.stringify(requirements));
    for (const object in requirements) {
      if (req[object].platform) {
        if (req[object].platform[platform]) {
          Object.assign(req[object], req[object].platform[platform]);
          delete req[object].platform;
        } else {
          delete req[object];
        }
      }
    }
    return req;
  }

  public static resetConfiguration(): void {
    ToolsConfig.tool = ToolsConfig.loadMetadata(configData, Platform.OS);
  }

  static getTknLocation(cmd: string): string {
    return ToolsConfig.tool[cmd]?.location;
  }

  public static async detectOrDownload(cmd: string): Promise<string> {

    let toolLocation: string = ToolsConfig.tool[cmd]?.location;

    if (toolLocation === undefined) {
      let response: string;
      const toolCacheLocation = path.resolve(Platform.getUserHomePath(), '.vs-tekton', ToolsConfig.tool[cmd].cmdFileName);
      const whichLocation = which(cmd);
      const toolLocations: string[] = [whichLocation ? whichLocation.stdout : null, toolCacheLocation];
      toolLocation = await ToolsConfig.selectTool(toolLocations, ToolsConfig.tool[cmd].versionRange, cmd);
      const downloadVersion = `Download ${ToolsConfig.tool[cmd].version}`;

      if (toolLocation) {
        const currentVersion = await ToolsConfig.getVersion(toolLocation, cmd);
        if (!semver.satisfies(currentVersion, `>=${ToolsConfig.tool[cmd].versionRange}`) && cmd !== 'kubectl') {
          response = await vscode.window.showWarningMessage(`Detected unsupported tkn version: ${currentVersion}. Supported tkn version: ${ToolsConfig.tool[cmd].versionRangeLabel}.`, downloadVersion, 'Cancel');
        }
      }
      if (await ToolsConfig.getVersion(toolCacheLocation, cmd) === ToolsConfig.tool[cmd].version && response !== 'Cancel') {
        response = 'Cancel';
        toolLocation = toolCacheLocation;
      }

      if (toolLocation === undefined || response === downloadVersion) {
        // otherwise request permission to download
        const toolDlLocation = path.resolve(Platform.getUserHomePath(), '.vs-tekton', ToolsConfig.tool[cmd].dlFileName);
        const installRequest = `Download and install v${ToolsConfig.tool[cmd].version}`;

        if (response !== downloadVersion) {
          response = await vscode.window.showInformationMessage(
            `Cannot find Tekton CLI ${ToolsConfig.tool[cmd].versionRangeLabel} for interacting with Tekton Pipelines. Commands which requires Tekton CLI will be disabled.`, installRequest, 'Help', 'Cancel');
        }
        await fsex.ensureDir(path.resolve(Platform.getUserHomePath(), '.vs-tekton'));
        if (response === installRequest || response === downloadVersion) {
          let action: string;
          do {
            action = undefined;
            await vscode.window.withProgress({
              cancellable: true,
              location: vscode.ProgressLocation.Notification,
              title: `Downloading ${ToolsConfig.tool[cmd].description}`
            }, (progress: vscode.Progress<{ increment: number; message: string }>) => DownloadUtil.downloadFile(
              ToolsConfig.tool[cmd].url,
              toolDlLocation,
              (dlProgress, increment) => progress.report({ increment, message: `${dlProgress}%` }))
            );

            const sha256sum: string = await hasha.fromFile(toolDlLocation, { algorithm: 'sha256' });
            if (sha256sum !== ToolsConfig.tool[cmd].sha256sum) {
              fsex.removeSync(toolDlLocation);
              action = await vscode.window.showInformationMessage(`Checksum for downloaded ${ToolsConfig.tool[cmd].description} v${ToolsConfig.tool[cmd].version} is not correct.`, 'Download again', 'Cancel');
            }

          } while (action === 'Download again');

          if (action !== 'Cancel') {
            if (toolDlLocation.endsWith('.zip') || toolDlLocation.endsWith('.tar.gz')) {
              await Archive.unzip(toolDlLocation, path.resolve(Platform.getUserHomePath(), '.vs-tekton'), ToolsConfig.tool[cmd].filePrefix);
              await fsex.remove(toolDlLocation);
            } else if (toolDlLocation.endsWith('.gz')) {
              await Archive.unzip(toolDlLocation, toolCacheLocation, ToolsConfig.tool[cmd].filePrefix);
              await fsex.remove(toolDlLocation);
            } else {
              fsex.renameSync(toolDlLocation, toolCacheLocation);
            }
            if (Platform.OS !== 'win32') {
              await fsex.chmod(toolCacheLocation, '765');
            }
            toolLocation = toolCacheLocation;
          }
        } else if (response === 'Help') {
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/redhat-developer/vscode-tekton#dependencies'));
        }
      }
      if (toolLocation) {
        // TODO: 
        // eslint-disable-next-line require-atomic-updates
        ToolsConfig.tool[cmd].location = toolLocation;
      }
    }
    return toolLocation;
  }

  public static async getVersion(location: string, cmd?: string): Promise<string> {
    let detectedVersion: string;
    if (await fsex.pathExists(location)) {
      const version = new RegExp('^Client version:\\s[v]?([0-9]+\\.[0-9]+\\.[0-9]+)$');
      if (cmd === 'kubectl') {
        const result = await cli.execute(createCliCommand(`"${location}"`, 'version', '-o', 'json'));
        if (result.stdout) {
          const jsonKubectlVersion = JSON.parse(result.stdout)['clientVersion'];
          detectedVersion = `${jsonKubectlVersion['major']}.${jsonKubectlVersion['minor']}.0`;
        }
      } else {
        const result = await cli.execute(createCliCommand(`"${location}"`, 'version'));
        if (result.stdout) {
          const toolVersion: string[] = result.stdout.trim().split('\n').filter((value) => {
            return value.match(version);
          }).map((value) => version.exec(value)[1]);
          if (toolVersion.length) {
            detectedVersion = toolVersion[0];
          }
        }
      }
    }
    return detectedVersion;
  }

  public static async selectTool(locations: string[], versionRange: string, cmd?: string): Promise<string> {
    let result: string;
    for (const location of locations) {
      if (await fsex.pathExists(location)) {
        const configVersion = await ToolsConfig.getVersion(location, cmd);
        if (location && (semver.satisfies(configVersion, `>=${versionRange}`)) || semver.satisfies(configVersion, versionRange)) {
          result = location;
          break;
        }
      }
    }
    return result;
  }
}
