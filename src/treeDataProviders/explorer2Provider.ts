import { Dirent, readdirSync, Stats, statSync } from "fs";
import * as path from "path";
import { basename } from "path";
import * as vscode from "vscode";
import { FileType } from "vscode";
import { config } from "../global";
import { Entry } from "../interfaces/entryInterface";
import bytes = require("bytes");
import moment = require("moment");

const SORT_OPTIONS = ["sortByName", "sortByTime", "sortBySize"];

interface File {
  name: string;
  type: FileType;
  ctime: number;
  mtime: number;
  mode: string;
  size: number;
}

export class explorer2Provider implements vscode.TreeDataProvider<Entry> {
  private _onDidChangeTreeData: vscode.EventEmitter<any[] | undefined> = new vscode.EventEmitter<any[] | undefined>();
  public onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

  collapse(): void {
    vscode.commands.executeCommand("workbench.actions.treeView.explorer2.collapseAll");
    this._onDidChangeTreeData.fire(null);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  getDirectoryContent(uri: vscode.Uri): File[] {
    let children: Dirent[] = [];
    children = readdirSync(uri.fsPath, { withFileTypes: true });

    const result: File[] = [];
    for (let i = 0; i < children.length; i++) {
      const file = children[i];
      const filePath = path.join(uri.fsPath, file.name);
      let stat: Stats;
      try {
        if (filePath === "/.VolumeIcon.icns") {
          continue;
        }
        stat = statSync(filePath);
      } catch (err) {
        console.log(`src/treeDataProviders/explorer2Provider.ts:71 err`, err);
        continue;
      }
      let fileType: FileType;
      if (file.isDirectory()) {
        fileType = FileType.Directory;
      } else if (file.isFile()) {
        fileType = FileType.File;
      } else if (file.isSymbolicLink()) {
        fileType = FileType.SymbolicLink;
      } else {
        fileType = FileType.Unknown;
      }
      console.log(`src/treeDataProviders/explorer2Provider.ts:63`, stat);
      const myFile: File = {
        name: file.name,
        type: fileType,
        size: stat.size,
        mtime: stat.mtimeMs,
        ctime: stat.birthtimeMs,
        mode: stat.mode.toFixed(),
      };
      result.push(myFile);
    }

    return result;
  }

  resolveTreeItem?(item: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem> {
    return item;
  }

  getParent(): vscode.ProviderResult<Entry> {
    return null;
  }

  getChildren(element?: Entry): Entry[] {
    if (element) {
      const newUri = vscode.Uri.parse(path.join(config.mainRootDirectory, element.uri.fsPath));
      const files = this.getDirectoryContent(newUri);

      return this.sort(files, element.uri.fsPath);
    }
    config.gotoViaRefresh = undefined;

    let files: File[] = [];
    try {
      files = this.getDirectoryContent(vscode.Uri.file(config.mainRootDirectory));
    } catch (error) {
      console.log(`Can get a directory content`, config.mainRootDirectory, error);
    }

    let children = [];
    if (config.mainRootDirectory !== "/") {
      const goUp = {
        id: "goUpInTheTree",
      };
      children.push(goUp);
    }

    const children_ = this.sort(files, "");
    children = [...children, ...children_];

    return children;
  }

  sort(files: File[], rootPath: string): Entry[] {
    let children = [];
    children = files.map((file) => ({
      uri: vscode.Uri.file(path.join(rootPath, file.name)),
      type: file.type,
      ctime: file.ctime,
      mtime: file.mtime,
      size: file.size,
      mode: file.mode
    }));

    if (config.sorting === "nameAsc") {
      children = this.sortByNameAsc(children);
    }
    if (config.sorting === "nameDesc") {
      children = this.sortByNameDesc(children);
    }
    if (config.sorting === "sizeAsc") {
      children = this.sortBySizeAsc(children);
    }
    if (config.sorting === "sizeDesc") {
      children = this.sortBySizeDesc(children);
    }
    if (config.sorting === "timeAsc") {
      children = this.sortByTimeAsc(children);
    }
    if (config.sorting === "timeDesc") {
      children = this.sortByTimeDesc(children);
    }

    return children;
  }

  getTreeItem(element: Entry): vscode.TreeItem {
    if (element.id === "goUpInTheTree") {
      const goUpInTheTree = {
        id: element.id,
        label: undefined,
        iconPath: new (vscode.ThemeIcon as any)("reply"),
        description: config.mainRootDirectory,
        contextValue: "goUpInTheTree",
        command: undefined,
      };
      goUpInTheTree.command = { command: "explorer2.goUpInTheTree", arguments: [], title: "Go up" };

      return goUpInTheTree;
    }
    const treeItem = new vscode.TreeItem(
      element.uri,
      [vscode.FileType.Directory, vscode.FileType.SymbolicLink].includes(element.type)
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    treeItem.contextValue = `modified:${moment(element.mtime).fromNow()}`;

    if (element.type === vscode.FileType.File) {
      treeItem.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [vscode.Uri.parse(path.join(config.mainRootDirectory, element.uri.fsPath))],
      };
      treeItem.contextValue += ";type:file";
    } else {
      treeItem.command = { command: "explorer2.openFolder", title: "Open Folder", arguments: [element.uri] };
      treeItem.contextValue += ";type:folder";
    }

    let tooltip: string;
    tooltip = "Created: " + moment(element.ctime).format("dddd, MMMM Do YYYY, h:mm:ss a")+"\n";
    tooltip += "Modified: " + moment(element.mtime).format("dddd, MMMM Do YYYY, h:mm:ss a")+"\n";
    tooltip += "Mode: " + '0' + (element.mode & parseInt('777', 8)).toString(8) +"\n";
  
    if (element.type === vscode.FileType.File) {
      treeItem.description = bytes(element.size);
      tooltip += "Size: " + bytes(element.size) +"\n";
    }

    treeItem.tooltip = tooltip;

    return treeItem;
  }

  private setContext(sorting: string, type: string) {
    SORT_OPTIONS.forEach((element) => {
      if (element === sorting) {
        vscode.commands.executeCommand("setContext", "explorer2.context." + element, false);
      } else {
        vscode.commands.executeCommand("setContext", "explorer2.context." + element, true);
        vscode.commands.executeCommand("setContext", "explorer2.context." + element + "Asc", false);
        vscode.commands.executeCommand("setContext", "explorer2.context." + element + "Desc", false);
      }
      if (type === "desc") {
        vscode.commands.executeCommand("setContext", "explorer2.context." + sorting + "Desc", true);
        vscode.commands.executeCommand("setContext", "explorer2.context." + sorting + "Asc", false);
      }
      if (type === "asc") {
        vscode.commands.executeCommand("setContext", "explorer2.context." + sorting + "Asc", true);
        vscode.commands.executeCommand("setContext", "explorer2.context." + sorting + "Desc", false);
      }
    });
  }

  private sortByNameAsc(nodes: any[]): any[] {
    this.setContext("sortByName", "asc");

    return nodes.sort((n1, n2) => {
      return basename(n1.uri.fsPath).localeCompare(basename(n2.uri.fsPath));
    });
  }

  private sortByNameDesc(nodes: any[]): any[] {
    this.setContext("sortByName", "desc");

    return nodes.sort((n1, n2) => {
      return basename(n2.uri.fsPath).localeCompare(basename(n1.uri.fsPath));
    });
  }

  private sortByTimeAsc(nodes: any[]): any[] {
    this.setContext("sortByTime", "asc");

    return nodes.sort((n1, n2) => {
      return n1.mtime - n2.mtime;
    });
  }

  private sortByTimeDesc(nodes: any[]): any[] {
    this.setContext("sortByTime", "desc");

    return nodes.sort((n1, n2) => {
      return n2.mtime - n1.mtime;
    });
  }

  private sortBySizeAsc(nodes: any[]): any[] {
    this.setContext("sortBySize", "asc");

    return nodes.sort((n1, n2) => {
      if (n1.type === FileType.Directory && n2.type !== FileType.Directory) {
        return -1;
      }

      if (n1.type !== FileType.Directory && n2.type === FileType.Directory) {
        return 1;
      }

      return n1.size - n2.size;
    });
  }

  private sortBySizeDesc(nodes: any[]): any[] {
    this.setContext("sortBySize", "desc");

    return nodes.sort((n1, n2) => {
      if (n2.type === FileType.Directory && n1.type !== FileType.Directory) {
        return -1;
      }

      if (n2.type !== FileType.Directory && n1.type === FileType.Directory) {
        return 1;
      }

      return n2.size - n1.size;
    });
  }
}
