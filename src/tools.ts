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
import { createCliCommand, cli, CliCommand } from './cli';
import semver = require('semver');
import configData = require('./tools.json');
import { getStderrString } from './util/stderrstring';
import { ERR_CLUSTER_TIMED_OUT } from './constants';

export class ToolsConfig {

  public static tool: object = ToolsConfig.loadMetadata(configData, Platform.OS);

  public static loadMetadata(requirements, platform): object {
    const req = JSON.parse(JSON.stringify(requirements));
    for (const object in requirements) {
      if (req[object].platform) {
        if (process.arch === 'arm64' && platform === 'darwin') {
          // eslint-disable-next-line no-param-reassign
          platform = `${platform}-arm64`;
        }
        if (object === 'tkn' && platform === 'darwin-arm64') {
          // eslint-disable-next-line no-param-reassign
          platform = Platform.OS;
        }
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

  static getToolLocation(cmd: string): string {
    return ToolsConfig.tool[cmd]?.location;
  }

  /**
   * Detect if the cmd executable exists locally and its version is valid, based on the version range defined by the toolsconfig.json.
   * If the plugin is not able to retrieve the version (timed_out error), the user needs to be informed.
   * If the plugin does not find any valid executable, it asks the user to download one
   * If the plugin find a valid executable, it is used to execute the following commands
   * 
   * @param cmd name of the command to run. Used to identify the executable to use (kubectl or tkn)
   * @returns the location of a valid executable or the error if unable to find it or undefined if no valid executable has been found or downloaded
   */
  public static async detectOrDownload(cmd: string): Promise<ToolConfigResult | undefined> {

    let toolResult: ToolConfigResult | undefined = undefined;
    const toolLocation: string = ToolsConfig.tool[cmd]?.location;
    if (toolLocation !== undefined) {
      toolResult = {
        location: toolLocation
      };
    }

    if (toolResult === undefined) {
      let response: string;
      const toolCacheLocation = path.resolve(Platform.getUserHomePath(), '.vs-tekton', ToolsConfig.tool[cmd].cmdFileName);
      const whichLocation = which(cmd);
      const toolLocations: string[] = [whichLocation ? whichLocation.stdout : null, toolCacheLocation];
      toolResult = await ToolsConfig.selectTool(toolLocations, ToolsConfig.tool[cmd].versionRange, cmd);
      // when selecting the tool we got a timed out error. Something is wrong with the cluster.
      if (toolResult && toolResult.error === ERR_CLUSTER_TIMED_OUT) {
        return toolResult;
      }

      if (toolResult === undefined) {
        // otherwise request permission to download
        const toolDlLocation = path.resolve(Platform.getUserHomePath(), '.vs-tekton', ToolsConfig.tool[cmd].dlFileName);
        const installRequest = `Download and install ${cmd} v${ToolsConfig.tool[cmd].version}`;

        if (cmd === 'tkn') {
          response = await vscode.window.showInformationMessage(
            `Cannot find Tekton CLI ${ToolsConfig.tool[cmd].versionRangeLabel} for interacting with Tekton Pipelines. Commands which requires Tekton CLI will be disabled.`, installRequest, 'Help', 'Cancel');
        }
        if (cmd === 'kubectl') {
          response = await vscode.window.showInformationMessage(
            `Cannot find ${ToolsConfig.tool[cmd].description} v${ToolsConfig.tool[cmd].version}.`, installRequest, 'Cancel');
        }
        await fsex.ensureDir(path.resolve(Platform.getUserHomePath(), '.vs-tekton'));
        if (response === installRequest) {
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
              await ToolsConfig.unzipAndRemove(toolDlLocation, path.resolve(Platform.getUserHomePath(), '.vs-tekton'), cmd);
            } else if (toolDlLocation.endsWith('.gz')) {
              await ToolsConfig.unzipAndRemove(toolDlLocation, toolCacheLocation, cmd);
            } else {
              fsex.renameSync(toolDlLocation, toolCacheLocation);
            }
            if (Platform.OS !== 'win32') {
              await fsex.chmod(toolCacheLocation, '765');
            }
            toolResult = {
              location: toolCacheLocation,
              version: ToolsConfig.tool[cmd].version
            };
          }
        } else if (response === 'Help') {
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/redhat-developer/vscode-tekton#dependencies'));
        }
      }
      if (toolResult && toolResult.location) {
        // TODO: 
        // eslint-disable-next-line require-atomic-updates
        ToolsConfig.tool[cmd].location = toolResult.location;
      }
    }
    return toolResult;
  }

  private static async unzipAndRemove(toolDlLocation: string, extractTo: string, cmd: string): Promise<void> {
    await Archive.unzip(toolDlLocation, extractTo, ToolsConfig.tool[cmd].filePrefix);
    await fsex.remove(toolDlLocation);
  }

  public static async getVersion(location: string, cmd?: string): Promise<ToolConfigResult | undefined> {
    let detectedVersion: ToolConfigResult | undefined = undefined;
    if (await fsex.pathExists(location)) {
      if (cmd === 'kubectl') {
        detectedVersion = await this.getVersionInner(
          (stdout) => {
            const jsonKubectlVersion = JSON.parse(stdout)['clientVersion'];
            return `${jsonKubectlVersion['major']}.${jsonKubectlVersion['minor']}.0`;
          },
          createCliCommand(`"${location}"`, 'version', '-o', 'json')
        );
      } else {
        detectedVersion = await this.getVersionInner(
          (stdout) => {
            const version = new RegExp('^Client version:\\s[v]?([0-9]+\\.[0-9]+\\.[0-9]+)$');
            const toolVersion: string[] = stdout.trim().split('\n').filter((value) => {
              return value.match(version);
            }).map((value) => version.exec(value)[1]);
            if (toolVersion.length) {
              return toolVersion[0];
            }
            return undefined;
          },
          createCliCommand(`"${location}"`, 'version')
        );
      }
    }
    return detectedVersion;
  }

  private static async getVersionInner(extractVersionFunc: (string) => string, cliCommand: CliCommand): Promise<ToolConfigResult> {
    const result = await cli.execute(cliCommand);
    if (result.error && getStderrString(result.error).indexOf(ERR_CLUSTER_TIMED_OUT) > -1) {
      return {
        error: ERR_CLUSTER_TIMED_OUT,
      };
    }
    if (result.stdout) {
      return {
        version: extractVersionFunc(result.stdout),
      }
    }
    return undefined;
  }

  public static async selectTool(locations: string[], versionRange: string, cmd?: string): Promise<ToolConfigResult | undefined> {
    for (const location of locations) {
      if (location && await fsex.pathExists(location)) {
        const toolVersionResult = await ToolsConfig.getVersion(location, cmd);
        if (toolVersionResult) {
          // if the command time out there is some issue with the cluster and we inform the user
          if (toolVersionResult.error) {
            return toolVersionResult;
          }
          if (semver.satisfies(toolVersionResult.version, `>=${versionRange}`) || semver.satisfies(toolVersionResult.version, versionRange)) {
            return {
              ...toolVersionResult,
              location,              
            };
          }
        }          
      }      
    }
    return undefined;
  }
}
export interface ToolConfigResult {
  version?: string;
  location?: string;
  error?: string;
}
