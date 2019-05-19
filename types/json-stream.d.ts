import { Transform, TransformOptions } from "stream";

declare module "json-stream"{

  export class JSONStream extends Transform {
    constructor( options? : TransformOptions);
  }
}
