import * as path from "path";
import * as vscode from "vscode";
import { config } from "../global";
import { Entry } from "../interfaces/entryInterface";

export class OpenedProvider implements vscode.TreeDataProvider<Entry> {
  private _onDidChangeTreeData: vscode.EventEmitter<any[] | undefined> = new vscode.EventEmitter<any[] | undefined>();
  public onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  getChildren(): any[] {
    return config.opened;
  }

  getTreeItem(element: any): vscode.TreeItem {
    const item = {
      id: element,
      label: path.basename(element),
      iconPath: new (vscode.ThemeIcon as any)("folder"),
      description: element,
      command: undefined,
    };
    item.command = { command: "opened.open", arguments: [element], title: "Open" };

    return item;
  }
}
