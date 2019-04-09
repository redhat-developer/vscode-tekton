import * as path from 'path';
import {Uri} from 'vscode';

const images= path.normalize('images');


export function getIcon(filename: string): Uri {
      return Uri.file(path.join(__dirname,'../', images, filename));
}
