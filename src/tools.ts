/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Platform } from "./util/platform";
import { Archive } from "./util/archive";
import { which } from "shelljs";
import { DownloadUtil } from "./util/download";
import hasha = require("hasha");
import open = require("open");
import * as vscode from 'vscode';
import * as path from 'path';
import * as fsex from 'fs-extra';
import * as fs from 'fs';
import { createCliCommand, CliImpl } from './cli';
import semver = require('semver');
import configData = require('./tools.json');


export class ToolsConfig {

    public static tool: object = ToolsConfig.loadMetadata(configData, Platform.OS);

    public static loadMetadata(requirements, platform): object {
        const req = JSON.parse(JSON.stringify(requirements));
        if (req['tkn'].platform) {
            if (req['tkn'].platform[platform]) {
                Object.assign(req['tkn'], req['tkn'].platform[platform]);
                delete req['tkn'].platform;
            } else {
                delete req['tkn'];
            }
        }
        return req;
    }

    public static resetConfiguration(): void {
        ToolsConfig.tool = ToolsConfig.loadMetadata(configData, Platform.OS);
    }

    public static async detectOrDownload(): Promise<string> {

        let toolLocation: string = ToolsConfig.tool['tkn'].location;

        if (toolLocation === undefined) {
            let response: string;
            const toolCacheLocation = path.resolve(Platform.getUserHomePath(), '.vs-tekton', ToolsConfig.tool['tkn'].cmdFileName);
            const whichLocation = which('tkn');
            const toolLocations: string[] = [whichLocation ? whichLocation.stdout : null, toolCacheLocation];
            toolLocation = await ToolsConfig.selectTool(toolLocations, ToolsConfig.tool['tkn'].versionRange);
            const downgradeVersion = `Downgrade to ${ToolsConfig.tool['tkn'].version}`;

            if (toolLocation && await ToolsConfig.getVersion(toolLocation) !== ToolsConfig.tool['tkn'].version) {
                response = await vscode.window.showWarningMessage(`Detected higher tkn version: ${await ToolsConfig.getVersion(toolLocation)} which is not yet supported. Supported tkn version: ${ToolsConfig.tool['tkn'].version}.`, downgradeVersion, 'Cancel');
            }
            if (await ToolsConfig.getVersion(toolCacheLocation) === ToolsConfig.tool['tkn'].version && response !== 'Cancel') {
                response = 'Cancel';
                toolLocation = toolCacheLocation;
            }

            if (toolLocation === undefined || response === downgradeVersion) {
                // otherwise request permission to download
                const toolDlLocation = path.resolve(Platform.getUserHomePath(), '.vs-tekton', ToolsConfig.tool['tkn'].dlFileName);
                const installRequest = `Download and install v${ToolsConfig.tool['tkn'].version}`;

                if (response !== downgradeVersion) {
                    response = await vscode.window.showInformationMessage(
                        `Cannot find ${ToolsConfig.tool['tkn'].description} ${ToolsConfig.tool['tkn'].versionRangeLabel}.`, installRequest, 'Help', 'Cancel');
                }
                fsex.ensureDirSync(path.resolve(Platform.getUserHomePath(), '.vs-tekton'));
                if (response === installRequest || response === downgradeVersion) {
                    let action: string;
                    do {
                        action = undefined;
                        await vscode.window.withProgress({
                            cancellable: true,
                            location: vscode.ProgressLocation.Notification,
                            title: `Downloading ${ToolsConfig.tool['tkn'].description}`
                        },
                            (progress: vscode.Progress<{ increment: number; message: string }>) => {
                                return DownloadUtil.downloadFile(
                                    ToolsConfig.tool['tkn'].url,
                                    toolDlLocation,
                                    (dlProgress, increment) => progress.report({ increment, message: `${dlProgress}%` })
                                );
                            });
                        const sha256sum: string = await hasha.fromFile(toolDlLocation, { algorithm: 'sha256' });
                        if (sha256sum !== ToolsConfig.tool['tkn'].sha256sum) {
                            fsex.removeSync(toolDlLocation);
                            action = await vscode.window.showInformationMessage(`Checksum for downloaded ${ToolsConfig.tool['tkn'].description} v${ToolsConfig.tool['tkn'].version} is not correct.`, 'Download again', 'Cancel');
                        }

                    } while (action === 'Download again');

                    if (action !== 'Cancel') {
                        if (toolDlLocation.endsWith('.zip') || toolDlLocation.endsWith('.tar.gz')) {
                            await Archive.unzip(toolDlLocation, path.resolve(Platform.getUserHomePath(), '.vs-tekton'), ToolsConfig.tool['tkn'].filePrefix);
                        } else if (toolDlLocation.endsWith('.gz')) {
                            await Archive.unzip(toolDlLocation, toolCacheLocation, ToolsConfig.tool['tkn'].filePrefix);
                        }
                        fsex.removeSync(toolDlLocation);
                        if (Platform.OS !== 'win32') {
                            fs.chmodSync(toolCacheLocation, '765');
                        }
                        toolLocation = toolCacheLocation;
                    }
                } else if (response === `Help`) {
                    open('https://github.com/redhat-developer/vscode-tekton#dependencies');
                }
            }
            if (toolLocation) {
                // TODO: 
                // eslint-disable-next-line require-atomic-updates
                ToolsConfig.tool['tkn'].location = toolLocation;
            }
        }
        return toolLocation;
    }

    public static async getVersion(location: string): Promise<string> {
        let detectedVersion: string;
        if (fs.existsSync(location)) {
            const version = new RegExp(`^Client version:\\s[v]?([0-9]+\\.[0-9]+\\.[0-9]+)$`);
            const result = await CliImpl.getInstance().execute(createCliCommand(`"${location}"`, 'version'));
            if (result.stdout) {
                const toolVersion: string[] = result.stdout.trim().split('\n').filter((value) => {
                    return value.match(version);
                }).map((value) => version.exec(value)[1]);
                if (toolVersion.length) {
                    detectedVersion = toolVersion[0];
                }
            }
        }
        return detectedVersion;
    }

    public static async selectTool(locations: string[], versionRange: string): Promise<string> {
        let result: string;
        for (const location of locations) {
            if (fs.existsSync(location)) {
                if (location && (await ToolsConfig.getVersion(location) > versionRange) || semver.satisfies(await ToolsConfig.getVersion(location), versionRange)) {
                    result = location;
                    break;
                }
            }
        }
        return result;
    }
}
