/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import targz = require('targz');

export class Archive {
    static unzip(zipFile: string, extractTo: string, prefix?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (zipFile.endsWith('.tar.gz')) {
                targz.decompress({
                    src: zipFile,
                    dest: extractTo,
                    tar: {
                        map: (header) => {
                            prefix && header.name.startsWith(prefix) ? header.name = header.name.substring(prefix.length) : header;
                            return header;
                        }
                    }
                }, (err) => {
                    err ? reject(err) : resolve();
                });
            }
            else {
                reject(`Unsupported extension for '${zipFile}'`);
            }
        });
    }
}