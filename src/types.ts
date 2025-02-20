import * as path from "path";
import * as ts from "typescript";
import {
  ensureTrailingPathDelimiter,
  getAlias,
  replaceDoubleSlashes,
  stripWildcard
} from "./utils";

export interface ITransformerOptions {}

export class ProjectOptions {
  public readonly baseUrl: string;

  private aliases: string[] = [];
  private paths: string[] = [];

  constructor(compilerOptions: ts.CompilerOptions) {
    this.baseUrl = compilerOptions.baseUrl || __dirname;
    this.processMappings(compilerOptions.paths || {});
  }

  public getMapping(requestedModule: string) {
    const alias = getAlias(requestedModule);

    const index = this.aliases.indexOf(alias);
    if (index < 0) {
      return null;
    }

    let mapping = this.paths[index];

    mapping = requestedModule.replace(alias, mapping);
    mapping = replaceDoubleSlashes(mapping);
    mapping = ensureTrailingPathDelimiter(mapping);

    return mapping;
  }

  private processMappings(paths: any) {
    for (const alias in paths) {
      this.aliases.push(stripWildcard(alias));
      this.paths.push(stripWildcard(paths[alias][0]));
    }
  }
}

export class PathAliasResolver {
  readonly outPath: string;
  readonly options: ProjectOptions;

  constructor(compilerOptions: ts.CompilerOptions) {
    const projectPath = process.cwd();

    this.options = new ProjectOptions(compilerOptions);
    this.outPath = path.resolve(projectPath, this.options.baseUrl || ".");
  }

  public resolve(fileName: string, requestedModule: string) {
    const mapping = this.options.getMapping(requestedModule);
    if (mapping) {
      const absoluteJsRequire = path.join(this.outPath, mapping);
      const sourceDir = path.dirname(fileName);

      let relativePath = path.relative(sourceDir, absoluteJsRequire);

      /* If the path does not start with .. it´ not a sub directory
       * as in ../ or ..\ so assume it´ the same dir...
       */
      if (relativePath[0] != ".") {
        relativePath = "." + path.sep + relativePath;
      }

      return relativePath;
    } else {
      return requestedModule;
    }
  }
}
